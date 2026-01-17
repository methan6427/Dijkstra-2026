import React, { useState } from 'react';
import './App.css';
// @ts-ignore
import sampleData from '../dijkstra_sample.txt?raw';

interface Edge {
    to: string;
    distance: number;
    time: number;
}

interface PathResult {
    path: string[];
    totalDistance: number;
    totalTime: number;
}

class MinHeap {
    private heap: Array<{ node: string; priority: number }> = [];

    push(node: string, priority: number) {
        this.heap.push({ node, priority });
        this.bubbleUp(this.heap.length - 1);
    }

    pop(): { node: string; priority: number } | undefined {
        if (this.heap.length === 0) return undefined;
        if (this.heap.length === 1) return this.heap.pop();

        const min = this.heap[0];
        this.heap[0] = this.heap.pop()!;
        this.bubbleDown(0);
        return min;
    }

    isEmpty(): boolean {
        return this.heap.length === 0;
    }

    private bubbleUp(idx: number) {
        while (idx > 0) {
            const parent = Math.floor((idx - 1) / 2);
            if (this.heap[idx].priority >= this.heap[parent].priority) break;
            [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
            idx = parent;
        }
    }

    private bubbleDown(idx: number) {
        const len = this.heap.length;
        while (true) {
            let smallest = idx;
            const left = 2 * idx + 1;
            const right = 2 * idx + 2;

            if (left < len && this.heap[left].priority < this.heap[smallest].priority) {
                smallest = left;
            }
            if (right < len && this.heap[right].priority < this.heap[smallest].priority) {
                smallest = right;
            }
            if (smallest === idx) break;

            [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
            idx = smallest;
        }
    }
}

const dijkstra = (
    graph: Map<string, Edge[]>,
    start: string,
    end: string,
    mode: 'distance' | 'time'
): PathResult | null => {
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    const pq = new MinHeap();
    const visited = new Set<string>();

    dist.set(start, 0);
    pq.push(start, 0);

    while (!pq.isEmpty()) {
        const current = pq.pop();
        if (!current) break;

        const { node: u } = current;
        if (visited.has(u)) continue;
        visited.add(u);

        if (u === end) break;

        const neighbors = graph.get(u);
        if (!neighbors) continue;

        for (const edge of neighbors) {
            if (visited.has(edge.to)) continue;

            const weight = mode === 'distance' ? edge.distance : edge.time;
            const alt = (dist.get(u) || 0) + weight;

            if (!dist.has(edge.to) || alt < dist.get(edge.to)!) {
                dist.set(edge.to, alt);
                prev.set(edge.to, u);
                pq.push(edge.to, alt);
            }
        }
    }

    if (!dist.has(end)) return null;

    const path: string[] = [];
    let curr: string | null | undefined = end;
    while (curr) {
        path.unshift(curr);
        curr = prev.get(curr);
    }

    let totalDist = 0, totalTime = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const edges = graph.get(path[i]);
        const edge = edges?.find(e => e.to === path[i + 1]);
        if (edge) {
            totalDist += edge.distance;
            totalTime += edge.time;
        }
    }

    return { path, totalDistance: totalDist, totalTime: totalTime };
};

export default function DijkstraRouter() {
    const [graph, setGraph] = useState<Map<string, Edge[]>>(new Map());
    const [nodeList, setNodeList] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
    const [fileLoaded, setFileLoaded] = useState(false);

    const [source, setSource] = useState('');
    const [destination, setDestination] = useState('');
    const [mode, setMode] = useState<'distance' | 'time' | 'both'>('distance');

    const [result, setResult] = useState<{
        distResult?: PathResult | null;
        timeResult?: PathResult | null;
    }>({});
    const [computing, setComputing] = useState(false);

    const parseFileStreaming = async (text: string) => {
        setLoading(true);
        const lines = text.trim().split('\n');

        // Parse first line: source destination choice (1=Distance, 2=Time, 3=Both)
        const firstLine = lines[0].trim().split(/\s+/);
        if (firstLine.length >= 3) {
            const [sourceNode, destNode, choiceStr] = firstLine;
            setSource(sourceNode);
            setDestination(destNode);

            const choice = parseInt(choiceStr);
            if (choice === 1) {
                setMode('distance');
            } else if (choice === 2) {
                setMode('time');
            } else if (choice === 3) {
                setMode('both');
            }
        }

        // Parse remaining lines as edge data
        const edgeLines = lines.slice(1);
        const totalLines = edgeLines.length;
        const CHUNK_SIZE = 2000;

        const newGraph = new Map<string, Edge[]>();
        const allNodes = new Set<string>();

        for (let i = 0; i < edgeLines.length; i += CHUNK_SIZE) {
            const chunk = edgeLines.slice(i, Math.min(i + CHUNK_SIZE, edgeLines.length));

            for (const line of chunk) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 4) {
                    const [n1, n2, distStr, timeStr] = parts;
                    const dist = parseFloat(distStr);
                    const time = parseFloat(timeStr);

                    allNodes.add(n1);
                    allNodes.add(n2);

                    if (!newGraph.has(n1)) newGraph.set(n1, []);

                    const n1Edges = newGraph.get(n1);
                    if (n1Edges) {
                        n1Edges.push({ to: n2, distance: dist, time });
                    }
                }
            }

            setLoadingProgress({
                current: Math.min(i + CHUNK_SIZE, totalLines),
                total: totalLines
            });
            await new Promise<void>(resolve => setTimeout(resolve, 0));
        }

        setGraph(newGraph);
        setNodeList(Array.from(allNodes).sort());
        setFileLoaded(true);
        setLoading(false);
        setLoadingProgress({ current: 0, total: 0 });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            parseFileStreaming(text);
        };
        reader.readAsText(file);
    };

    const handleLoadSample = () => {
        parseFileStreaming(sampleData);
    };

    const handleCompute = async () => {
        if (!source || !destination) {
            alert('Please select source and destination nodes');
            return;
        }

        setComputing(true);
        await new Promise<void>(resolve => setTimeout(resolve, 50));

        if (mode === 'both') {
            const distResult = dijkstra(graph, source, destination, 'distance');
            const timeResult = dijkstra(graph, source, destination, 'time');
            setResult({ distResult, timeResult });
        } else {
            const res = dijkstra(graph, source, destination, mode);
            setResult(mode === 'distance' ? { distResult: res } : { timeResult: res });
        }

        setComputing(false);
    };

    const reset = () => {
        setResult({});
        setSource('');
        setDestination('');
    };

    const progressPercent = loadingProgress.total > 0
        ? Math.round((loadingProgress.current / loadingProgress.total) * 100)
        : 0;

    return (
        <div className="app-container">
            <div className="max-width">
                <div className="app-header">
                    <div className="header-content">
                        <img src="/logo.png" alt="Logo" className="app-logo" />
                        <div>
                            <h1 className="app-title">Dijkstra Multi-Criteria Shortest Path</h1>
                            <p className="app-subtitle">Graph-Based Routing with Distance and Time Optimization</p>
                        </div>
                    </div>
                </div>

                <div className="app-grid">
                    <div>
                        <div className="card">
                            <h3 className="card-title">📁 Load Graph Data</h3>

                            <input
                                type="file"
                                accept=".txt"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                                id="file-upload"
                                disabled={loading}
                            />
                            <div className="file-input-wrapper">
                                <label
                                    htmlFor="file-upload"
                                    className={`btn ${loading ? 'btn-disabled' : ''}`}
                                >
                                    {loading ? '⏳ Processing...' : '� Choose File'}
                                </label>
                            </div>

                            <button
                                onClick={handleLoadSample}
                                className={`btn btn-secondary ${loading ? 'btn-disabled' : ''}`}
                                disabled={loading}
                            >
                                📄 Load Dijkstra Sample
                            </button>

                            {loading && (
                                <>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                                    </div>
                                    <p style={{ color: '#cbd5e1', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>
                                        {progressPercent}% - {loadingProgress.current.toLocaleString()} / {loadingProgress.total.toLocaleString()} lines
                                    </p>
                                </>
                            )}

                            {fileLoaded && (
                                <div className="stats-box">
                                    <p className="stats-title">✓ Graph Loaded Successfully</p>
                                    <p className="stats-text"><strong>Nodes:</strong> {nodeList.length.toLocaleString()}</p>
                                    <p className="stats-text"><strong>Edges:</strong> {Array.from(graph.values()).reduce((sum, edges) => sum + edges.length, 0).toLocaleString()}</p>
                                    <p className="stats-text"><strong>Type:</strong> Directed Graph</p>
                                </div>
                            )}
                        </div>

                        {fileLoaded && (
                            <>
                                <div className="card" style={{ marginTop: '16px' }}>
                                    <h3 className="card-title">📍 Select Nodes</h3>

                                    <label className="label">🟢 Source Node</label>
                                    <select
                                        value={source}
                                        onChange={(e) => setSource(e.target.value)}
                                        className="select"
                                    >
                                        <option value="">Select source node...</option>
                                        {nodeList.map(node => (
                                            <option key={node} value={node}>{node}</option>
                                        ))}
                                    </select>

                                    <label className="label" style={{ marginTop: '16px' }}>🔴 Destination Node</label>
                                    <select
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        className="select"
                                    >
                                        <option value="">Select destination node...</option>
                                        {nodeList.map(node => (
                                            <option key={node} value={node}>{node}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="card" style={{ marginTop: '16px' }}>
                                    <h3 className="card-title">⚙️ Optimization Mode</h3>

                                    <select
                                        value={mode}
                                        onChange={(e) => setMode(e.target.value as 'distance' | 'time' | 'both')}
                                        className="select"
                                    >
                                        <option value="distance">Shortest Distance</option>
                                        <option value="time">Minimum Time</option>
                                        <option value="both">Both (Compare)</option>
                                    </select>

                                    <button
                                        onClick={handleCompute}
                                        disabled={!source || !destination || computing}
                                        className={`btn btn-success ${(!source || !destination || computing) ? 'btn-disabled' : ''}`}
                                    >
                                        {computing ? '⏳ Computing...' : '▶️ Compute Path'}
                                    </button>

                                    <button
                                        onClick={reset}
                                        className="btn btn-secondary"
                                        style={{ marginTop: '12px' }}
                                    >
                                        ✖️ Clear Results
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="card">
                        <h3 className="card-title">📊 Results</h3>

                        {!result.distResult && !result.timeResult && (
                            <div className="empty-state">
                                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛣️</div>
                                <p style={{ fontSize: '18px' }}>Select nodes and compute path to see results</p>
                            </div>
                        )}

                        {result.distResult && (
                            <div className="result-card">
                                <h4 className="result-title">📏 Distance-Optimized Route</h4>

                                {result.distResult ? (
                                    <>
                                        <div className="metric-grid">
                                            <div className="metric-box">
                                                <p className="metric-label">Total Distance</p>
                                                <p className="metric-value">
                                                    {result.distResult.totalDistance.toFixed(2)} km
                                                </p>
                                            </div>
                                            <div className="metric-box">
                                                <p className="metric-label">Total Time</p>
                                                <p className="metric-value">
                                                    {result.distResult.totalTime.toFixed(2)} min
                                                </p>
                                            </div>
                                        </div>

                                        <div className="path-container">
                                            <p className="path-label">
                                                🛣️ Path Sequence ({result.distResult.path.length} nodes):
                                            </p>
                                            <div className="path-nodes">
                                                {result.distResult.path.map((node, idx) => (
                                                    <React.Fragment key={idx}>
                                                        <span className="node-chip">{node}</span>
                                                        {idx < result.distResult!.path.length - 1 && (
                                                            <span className="arrow">→</span>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p style={{ color: '#ef4444', fontWeight: 'bold' }}>❌ No path found</p>
                                )}
                            </div>
                        )}

                        {result.timeResult && (
                            <div className="result-card result-card-blue">
                                <h4 className="result-title result-title-blue">⏱️ Time-Optimized Route</h4>

                                {result.timeResult ? (
                                    <>
                                        <div className="metric-grid">
                                            <div className="metric-box metric-box-blue">
                                                <p className="metric-label">Total Time</p>
                                                <p className="metric-value metric-value-blue">
                                                    {result.timeResult.totalTime.toFixed(2)} min
                                                </p>
                                            </div>
                                            <div className="metric-box metric-box-blue">
                                                <p className="metric-label">Total Distance</p>
                                                <p className="metric-value metric-value-blue">
                                                    {result.timeResult.totalDistance.toFixed(2)} km
                                                </p>
                                            </div>
                                        </div>

                                        <div className="path-container path-container-blue">
                                            <p className="path-label">
                                                🛣️ Path Sequence ({result.timeResult.path.length} nodes):
                                            </p>
                                            <div className="path-nodes">
                                                {result.timeResult.path.map((node, idx) => (
                                                    <React.Fragment key={idx}>
                                                        <span className="node-chip node-chip-blue">{node}</span>
                                                        {idx < result.timeResult!.path.length - 1 && (
                                                            <span className="arrow arrow-blue">→</span>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p style={{ color: '#ef4444', fontWeight: 'bold' }}>❌ No path found</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}