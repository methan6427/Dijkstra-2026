# Dijkstra Algorithm Implementation Guide

This guide explains the exact code implementation used in your project. It is designed for an algorithms course context, focusing on *how* and *why* the code works, independent of React.

## 1. Core Data Structures

Before understanding the algorithm, we must understand how we store the graph and the helper structures.

### The Graph (`Map<string, Edge[]>`)
We use an **Adjacency List** to represent the graph.
- **Why?** It is memory efficient for sparse graphs (like road networks) compared to an Adjacency Matrix.
- **Structure**: A Map where:
  - **Key**: Node ID (e.g., "A", "B").
  - **Value**: List of `Edge` objects connected to that node.
  ```typescript
  interface Edge {
      to: string;      // The neighbor node
      distance: number; // Cost 1: Physical availability
      time: number;     // Cost 2: Travel time
  }
  ```

### The Priority Queue (`MinHeap`)
Dijkstra's algorithm relies on always exploring the "closest" or "cheapest" node next. A **Min-Heap** is the standard data structure for this.
- **Purpose**: Efficiently retrieve the node with the smallest current distance/time.
- **Complexity**:
  - `push`: **O(log N)**
  - `pop`: **O(log N)**
  - (A simple array scan would be O(N), making the total algorithm much slower).

#### How the `MinHeap` Class Works
1.  **Storage**: It uses a simple array `this.heap`. The logic is in how we arrange elements.
2.  **`push(node, priority)`**:
    - Add the new node to the *end* of the array.
    - **`bubbleUp`**: Compare the node with its parent. If it's smaller (higher priority), swap them. Repeat until the heap property is restored.
3.  **`pop()`**:
    - Remove the *root* (index 0, the smallest element).
    - Move the *last* element to the root position.
    - **`bubbleDown`**: Compare the new root with its children. Swap with the smaller child. Repeat until the heap property is restored.

---

## 2. The `dijkstra` Function Breakdown

The `dijkstra` function is the heart of the pathfinding logic. Here is the step-by-step execution flow:

### Phase 1: Initialization
```typescript
const dist = new Map<string, number>();         // Stores shortest known distance to each node
const prev = new Map<string, string | null>();  // Stores the "parent" node to reconstruct path
const pq = new MinHeap();                       // The generic priority queue
const visited = new Set<string>();              // Tracks finalized nodes
```
1.  **`dist` Map**: acts as our "result table". Initially empty (conceptually infinity).
2.  **`dist.set(start, 0)`**: We know the distance to the start node is 0.
3.  **`pq.push(start, 0)`**: Seed the priority queue with the start node.

### Phase 2: The Main Loop (`while (!pq.isEmpty())`)
This loop runs until we run out of reachable nodes or find our destination.

**Step A: Extract Min**
```typescript
const { node: u } = pq.pop(); // Get node with smallest known distance
if (visited.has(u)) continue; // Skip if we already found the optimal path to 'u'
visited.add(u);               // Mark 'u' as finalized
```
*   **Crucial Concept**: Once a node is added to `visited`, we are guaranteed to have found the shortest path to it (assuming non-negative weights). We never process it again.

**Step B: Target Check**
```typescript
if (u === end) break; // Optimization: Stop immediately if we reached the destination
```

**Step C: Relaxation (Checking Neighbors)**
We look at every neighbor of the current node `u`.
```typescript
const neighbors = graph.get(u);
for (const edge of neighbors) {
    if (visited.has(edge.to)) continue; // Don't look back at finalized nodes

    // 1. Calculate potential new total distance
    // 'mode' determines if we optimize for edges.distance or edges.time
    const weight = mode === 'distance' ? edge.distance : edge.time;
    const alt = (dist.get(u) || 0) + weight;

    // 2. Compare and Update
    if (!dist.has(edge.to) || alt < dist.get(edge.to)!) {
        dist.set(edge.to, alt); // Found a better path! Update distance
        prev.set(edge.to, u);   // Record that we came from 'u'
        pq.push(edge.to, alt);  // Add to queue to explore later
    }
}
```
*   **Relaxation**: This is the core logical step. "Can I reach neighbor `V` faster by going through `U` than any other way I've seen so far?"
*   If **Yes**: Update `dist[V]`, set `prev[V] = U`, and push `V` to the Queue.

### Phase 3: Path Reconstruction
Once the loop finishes, we have the shortest distances, but we need the actual path sequence.
```typescript
const path: string[] = [];
let curr: string | null | undefined = end;
while (curr) {
    path.unshift(curr);     // Add to front of list
    curr = prev.get(curr);  // Backtrack to parent
}
```
*   We start at the `end` node and look up “Who sent me here?” in the `prev` map.
*   We repeat this until we reach the `start` node (which has no parent).

---

## 3. Complexity Analysis (For your Mark)

When discussing this code, use these complexity terms:

- **Time Complexity**: **O(E log V)**
  - **V**: Number of vertices (nodes).
  - **E**: Number of edges.
  - **Explanation**: We visit each node once. For each node, we check all its edges. In the worst case, every edge check causes a `push` to the MinHeap. Pushing takes `O(log V)`. So, total time is roughly `E * log V`.

- **Space Complexity**: **O(V + E)**
  - We store the graph (**O(V + E)**).
  - We store `dist`, `prev`, and `visited` maps (**O(V)**).

## 4. React vs Algorithm Separation
For a non-React developer:
- **`DijkstraRouter`** (The React Component) is just the **Interface** / **Client**.
  - It reads the text file (Input).
  - It holds the `graph` variable in memory (State).
  - It calls the `dijkstra()` function when you click "Compute".
  - It draws the HTML based on the `PathResult` object returned.
- The **`dijkstra`** function and **`MinHeap`** class are **Pure TypeScript/JavaScript**. They do not know about HTML, buttons, or React. They could run in a Node.js server or a command line script without changes.
