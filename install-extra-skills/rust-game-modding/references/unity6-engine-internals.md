# Unity 6 Engine Internals & Performance Architecture

## Overview

Facepunch Rust dedicated servers execute on Unity 6 (Unity 6.3 engine) using the Mono runtime and targeting .NET Framework 4.8 (`net48`). In scenes containing upwards of 250,000 entities and complex dynamic player compounds, strict hardware-aligned memory and thread management is required to maintain fixed 30Hz/60Hz tick rates.

---

## 1. Memory Management & Garbage Collection Tuning

### Boehm Incremental GC Mechanics
Unity 6 utilizes the Boehm garbage collector with incremental collection support. Incremental passes split heap sweeping across frames based on `GarbageCollector.incrementalTimeSliceNanoseconds`.
* **The Full Collection Trap**: If managed allocation velocity outpaces incremental time slices, the runtime aborts incremental collection and triggers an emergency full GC sweep, freezing the main thread for multiple ticks (50ms–200ms hitch).
* **Controlled GC Mode**: Automatic collections can be disabled during combat or active simulation via `GarbageCollector.GCMode = GarbageCollector.Mode.Manual`. Incremental slices are then triggered manually during idle frames using `GarbageCollector.CollectIncremental(nanoseconds)` or full collections during transitions via `System.GC.Collect()`.

### Unmanaged Allocators & Rewindable Allocators
For high-frequency transient allocations (e.g. gathering entities within blast radius or line-of-sight checks):
* Standard `Allocator.Temp` incurs thread-synchronization overhead.
* `Allocator.Persistent` requires manual tracking to avoid native memory leaks.
* **`RewindableAllocator`**: A fast bump-pointer linear allocator. Resets its internal pointer to zero via `.Rewind()` at the end of each frame without individual free overhead:
```csharp
// Zero-allocation frame-transient memory
private RewindableAllocator rewindableAlloc;
public void BeginFrame() => rewindableAlloc.Rewind();
public NativeArray<T> AllocateTransient<T>(int count) where T : unmanaged => rewindableAlloc.AllocateNativeArray<T>(count);
```

---

## 2. Multi-Threading & Physics Batching

### RaycastCommand & Spatial Batching
Calling synchronous `Physics.Raycast` in tight loops or per-tick hooks blocks the main thread while PhysX resolves queries. Unity 6 exposes multi-threaded batch query systems through `RaycastCommand.ScheduleBatch`:

```csharp
public struct ParallelBallisticsProcessor
{
    private NativeArray<RaycastCommand> commands;
    private NativeArray<RaycastHit> results;
    private JobHandle batchJobHandle;

    public void Schedule(int rayCount, int minCommandsPerJob)
    {
        // Executes across PhysX worker threads
        batchJobHandle = RaycastCommand.ScheduleBatch(commands, results, minCommandsPerJob, default(JobHandle));
    }

    public void Complete()
    {
        batchJobHandle.Complete();
    }
}
```

### NativeArray Lifecycle Protocol
Any unmanaged container allocated for jobs (`Allocator.TempJob`) MUST be disposed inside a `finally` block verifying `.IsCreated`:
```csharp
var commands = new NativeArray<RaycastCommand>(count, Allocator.TempJob);
try {
    // Schedule and complete jobs
} finally {
    if (commands.IsCreated)
        commands.Dispose();
}
```
*Failure to dispose unmanaged containers triggers permanent unmanaged memory leaks under `net48`.*

---

## 3. Render Pipeline & GPU Resident Drawer (Client Graphics)

### GPU Resident Drawer (GPURD) & BatchRendererGroup (BRG)
GPURD maintains persistent object states in GPU `ByteAddressBuffers`, bypassing per-frame CPU transform collection and emitting indirect draw calls via `Graphics.DrawMeshInstancedIndirect`.

### The MaterialPropertyBlock Anti-Pattern
Invoking `Renderer.SetPropertyBlock(MaterialPropertyBlock)` on a `MeshRenderer` immediately breaks GPURD batching:
* Evicts the renderer from BatchRendererGroup batches back into single draw calls.
* Per-instance dynamic metadata (damage tint, aging) MUST be passed via DOTS Instancing buffer properties (`UNITY_DOTS_INSTANCED_PROP`) or structured compute buffers.

---

## 4. Adaptive Probe Volumes (APV)

Unity 6 replaces legacy light probe groups with Adaptive Probe Volumes:
* Cells stream asynchronously from disk to 3D GPU textures (`ProbeBrickIndex`, `ProbeBrickPool`).
* Rapid camera translation (mini-copters, scrap transports) must throttle cell blending via `ProbeReferenceVolume.instance.numberOfCellsBlendedPerFrame = 4` to prevent I/O upload stalls.
