import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Truck, Zap, Fuel, BatteryCharging, TrendingUp,
  RotateCcw, PlugZap, Plus, Trash2, MapPin, Settings, Sun, Moon, AlertTriangle, CheckCircle2,
  Sparkles, GitBranch, Route, DollarSign, Clock, BarChart3, PieChart as PieChartIcon, Target, Activity, Battery, Users, ToggleLeft, ToggleRight, Link2, Unlink, Info, Maximize2, Minimize2, ZoomIn, ZoomOut, Move, ArrowRight, CornerDownRight, Check
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LabelList, PieChart, Pie, Cell
} from "recharts";

// 1. Default Lookup Matrix for DIESEL Duty Cycle Efficiency
const DEFAULT_DIESEL_EFFICIENCY_MATRIX = {
  "6 lane highway/Expressway": {
    "High":   { 0: 1.10, 20: 0.90, 40: 0.70, 60: 0.60 },
    "Medium": { 0: 1.21, 20: 0.97, 40: 0.74, 60: 0.62 },
    "Low":    { 0: 1.33, 20: 1.05, 40: 0.77, 60: 0.64 }
  },
  "4 lane highway": {
    "High":   { 0: 0.99, 20: 0.81, 40: 0.63, 60: 0.54 },
    "Medium": { 0: 1.09, 20: 0.87, 40: 0.66, 60: 0.56 },
    "Low":    { 0: 1.20, 20: 0.94, 40: 0.69, 60: 0.57 }
  },
  "2 lane state highway": {
    "High":   { 0: 0.84, 20: 0.69, 40: 0.54, 60: 0.46 },
    "Medium": { 0: 0.93, 20: 0.74, 40: 0.56, 60: 0.47 },
    "Low":    { 0: 1.02, 20: 0.80, 40: 0.59, 60: 0.49 }
  },
  "City road": {
    "High":   { 0: 0.76, 20: 0.62, 40: 0.48, 60: 0.41 },
    "Medium": { 0: 0.83, 20: 0.67, 40: 0.51, 60: 0.43 },
    "Low":    { 0: 0.92, 20: 0.72, 40: 0.53, 60: 0.44 }
  },
  "Broken road": {
    "High":   { 0: 0.68, 20: 0.56, 40: 0.43, 60: 0.37 },
    "Medium": { 0: 0.75, 20: 0.60, 40: 0.46, 60: 0.38 },
    "Low":    { 0: 0.82, 20: 0.65, 40: 0.48, 60: 0.39 }
  }
};

// 2. Default Lookup Matrix for EV Duty Cycle Efficiency
const DEFAULT_EV_EFFICIENCY_MATRIX = {
  "6 lane highway/Expressway": {
    "High":   { 0: 1.35, 20: 1.08, 40: 0.82, 60: 0.69 },
    "Medium": { 0: 1.21, 20: 0.97, 40: 0.74, 60: 0.62 },
    "Low":    { 0: 1.10, 20: 0.88, 40: 0.68, 60: 0.57 }
  },
  "4 lane highway": {
    "High":   { 0: 1.40, 20: 1.12, 40: 0.85, 60: 0.72 },
    "Medium": { 0: 1.26, 20: 1.01, 40: 0.77, 60: 0.65 },
    "Low":    { 0: 1.15, 20: 0.92, 40: 0.70, 60: 0.59 }
  },
  "2 lane state highway": {
    "High":   { 0: 1.45, 20: 1.16, 40: 0.88, 60: 0.75 },
    "Medium": { 0: 1.32, 20: 1.05, 40: 0.80, 60: 0.68 },
    "Low":    { 0: 1.22, 20: 0.98, 40: 0.74, 60: 0.63 }
  },
  "City road": {
    "High":   { 0: 1.42, 20: 1.14, 40: 0.86, 60: 0.73 },
    "Medium": { 0: 1.55, 20: 1.24, 40: 0.95, 60: 0.80 },
    "Low":    { 0: 1.48, 20: 1.18, 40: 0.90, 60: 0.76 }
  },
  "Broken road": {
    "High":   { 0: 1.15, 20: 0.92, 40: 0.70, 60: 0.59 },
    "Medium": { 0: 1.20, 20: 0.96, 40: 0.73, 60: 0.61 },
    "Low":    { 0: 1.25, 20: 1.00, 40: 0.76, 60: 0.64 }
  }
};

const ROAD_TYPES = ["6 lane highway/Expressway", "4 lane highway", "2 lane state highway", "City road", "Broken road"];
const TRAFFIC_CONDITIONS = ["High", "Medium", "Low"];
const PAYLOAD_KEYS = [0, 20, 40, 60];

const PIE_COLOR_MAP = {
  "Capital & Infra": "#00f2fe",
  "Fuel/Energy": "#00e5a3",
  "EMI/Debt": "#f59e0b",
  "Maintenance & Ins": "#f43f5e",
  "Wages & Drivers": "#a855f7",
  "Tolls & Tyres": "#ec4899",
  "Battery Replacements": "#64748b",
  "Depot Upkeep": "#06b6d4",
  "Misc Overheads": "#fb923c",
  "Operator Margin": "#38bdf8"
};

function interpolateEfficiency(roadType, traffic, payload, vehicleType, dieselMatrix, evMatrix) {
  const activeMatrix = vehicleType === "electric" ? evMatrix : dieselMatrix;
  const road = activeMatrix[roadType] || activeMatrix["6 lane highway/Expressway"];
  const cond = road[traffic] || road["Medium"];

  if (payload <= 0) return cond[0];
  if (payload >= 60) return cond[60];

  let lowerKey = 0;
  let upperKey = 60;
  for (let i = 0; i < PAYLOAD_KEYS.length - 1; i++) {
    if (payload >= PAYLOAD_KEYS[i] && payload <= PAYLOAD_KEYS[i+1]) {
      lowerKey = PAYLOAD_KEYS[i];
      upperKey = PAYLOAD_KEYS[i+1];
      break;
    }
  }

  const lowerVal = cond[lowerKey];
  const upperVal = cond[upperKey];
  const ratio = (payload - lowerKey) / (upperKey - lowerKey);
  return lowerVal + ratio * (upperVal - lowerVal);
}

function computeWeightedMultiplier(stretches, payload, vehicleType, dieselMatrix, evMatrix) {
  let weightedMultiplier = 0;
  let sumStretch = 0;
  stretches.forEach((st) => {
    if (st.percentage > 0) {
      const matrixVal = interpolateEfficiency(st.roadType, st.traffic, payload, vehicleType, dieselMatrix, evMatrix);
      const refVal = interpolateEfficiency("6 lane highway/Expressway", "Medium", payload, vehicleType, dieselMatrix, evMatrix);
      const factor = refVal > 0 ? matrixVal / refVal : 1;
      weightedMultiplier += factor * (st.percentage / 100);
      sumStretch += st.percentage;
    }
  });
  const normalizeFactor = sumStretch > 0 ? 100 / sumStretch : 1;
  return weightedMultiplier * normalizeFactor;
}

function getSegPayload(seg, vehicleId) {
  return (seg.payloadByVehicle && seg.payloadByVehicle[vehicleId]) || 0;
}

function getPayloadCap(v) {
  return Math.max(0, v.gvwr - v.tractorWeight - v.trailerWeight) / 1000;
}

function sohAtCycleFraction(fractionOfLife, kneeSOH, kneeCycleFraction, eolSOH, postKneeExponent) {
  const f = Math.min(1, Math.max(0, fractionOfLife));
  const kf = Math.min(0.98, Math.max(0.02, kneeCycleFraction));
  if (f <= kf) {
    return 100 - (100 - kneeSOH) * (f / kf);
  }
  const postFrac = (f - kf) / Math.max(0.0001, 1 - kf);
  return kneeSOH - (kneeSOH - eolSOH) * Math.pow(postFrac, Math.max(1, postKneeExponent));
}

function cycleLifeForDoD(refCycleLifeAt100DoD, avgDoDFraction, dodStressExponentK) {
  const safeDoD = Math.min(1, Math.max(0.05, avgDoDFraction));
  return Math.max(1, (refCycleLifeAt100DoD || 1500) * Math.pow(1 / safeDoD, dodStressExponentK || 1.1));
}

const generateDefaultStretches = () => {
  const stretches = [];
  ROAD_TYPES.forEach((road) => {
    TRAFFIC_CONDITIONS.forEach((traffic) => {
      let pct = 0;
      if (road === "6 lane highway/Expressway" && traffic === "Medium") pct = 50;
      else if (road === "4 lane highway" && traffic === "High") pct = 20;
      else if (road === "2 lane state highway" && traffic === "Medium") pct = 10;
      else if (road === "City road" && traffic === "High") pct = 5;
      else if (road === "Broken road" && traffic === "Medium") pct = 15;
      stretches.push({ roadType: road, traffic, percentage: pct });
    });
  });
  return stretches;
};

const DEFAULT_ROUTE = [
  { id: "1", from: "A", to: "B", distance: 500, avgSpeed: 35, stretches: generateDefaultStretches(), hasDepotAtTo: true, payloadByVehicle: { "v-diesel-1": 38, "v-bev-1": 36.5 } },
  { id: "2", from: "B", to: "C", distance: 50, avgSpeed: 35, stretches: generateDefaultStretches(), hasDepotAtTo: true, payloadByVehicle: { "v-diesel-1": 0, "v-bev-1": 0 } },
  { id: "3", from: "C", to: "A", distance: 550, avgSpeed: 35, stretches: generateDefaultStretches(), hasDepotAtTo: true, payloadByVehicle: { "v-diesel-1": 38, "v-bev-1": 36.5 } }
];

const EV_SHADES = ["#00e5a3", "#00f2fe", "#38bdf8", "#818cf8"];
const DIESEL_SHADES = ["#f59e0b", "#fb923c", "#f43f5e", "#eab308"];

function colorForVehicle(v, allVehicles) {
  const sameTypeIdx = Math.max(0, allVehicles.filter((x) => x.type === v.type).findIndex((x) => x.id === v.id));
  const palette = v.type === "electric" ? EV_SHADES : DIESEL_SHADES;
  return palette[sameTypeIdx % palette.length];
}

function buildFlowSequence(v, routeSegments) {
  const waypoints = [];
  let cum = 0;
  waypoints.push({ km: 0, name: routeSegments[0]?.from || "Start" });
  routeSegments.forEach((seg) => {
    cum += seg.distance;
    waypoints.push({ km: Math.round(cum), name: seg.to });
  });
  
  const chargeKms = new Set((v.stopsLog || []).map((l) => l.km));
  const passThroughs = waypoints
    .filter((w) => !chargeKms.has(w.km) && w.km !== 0)
    .map((w) => ({ type: "waypoint", km: w.km, name: w.name }));
    
  const chargeNodes = (v.stopsLog || []).map((l) => ({ type: "charge", km: l.km, log: l }));
  const startNode = { type: "start", km: 0, name: waypoints[0].name };
  
  return [startNode, ...passThroughs, ...chargeNodes].sort((a, b) => a.km - b.km);
}

// ---------------------------------------------------------------------------
// CIRCULAR SOC PROGRESS COMPONENT
// ---------------------------------------------------------------------------
const CircularSoc = ({ soc, size = 44, stroke = 3.5, color = "var(--bev)" }) => {
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, parseFloat(soc) || 0)) / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute", top: 0, left: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="transparent" />
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round" fill="transparent"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <span className="num" style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text)" }}>{soc}%</span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ENHANCED INTERACTIVE CANVAS & AUTO-WRAP PIPELINE
// ---------------------------------------------------------------------------
const FlowCanvas = ({ v, flowSequence, chargingStationOverrides, updateChargingStationOverride, resetChargingStationOverride }) => {
  const memoryStorageKey = `truck-tco-flow-memory-${v.id}`;
  const modeStorageKey = `truck-tco-flow-mode-${v.id}`;
  
  const readFlowMemory = () => {
    try {
      const raw = localStorage.getItem(memoryStorageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
  };

  const [positions, setPositions] = useState(() => readFlowMemory().positions || {});
  const [flowchartMode, setFlowchartMode] = useState(() => {
    try { return localStorage.getItem(modeStorageKey) || "interactive"; } catch (_) { return "interactive"; }
  });

  // Canvas Pan & Zoom State
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Node Dragging State
  const [draggingKey, setDraggingKey] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredMergeTarget, setHoveredMergeTarget] = useState(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewportRef = useRef(null);

  // Group nodes: master station entities hold all merged stops cleanly
  const { masterNodes, visualEdges } = useMemo(() => {
    const rawMasterMap = {};
    const nodes = [];
    const keyToStationRoot = {};

    // Determine root station keys for all charge stops
    flowSequence.forEach(node => {
      if (node.type === "charge") {
        const ov = chargingStationOverrides[v.id]?.[node.log.key] || {};
        const isMerged = typeof ov.mergedInto === "string" && ov.mergedInto !== node.log.key;
        keyToStationRoot[node.log.key] = isMerged ? ov.mergedInto : node.log.key;
      }
    });

    flowSequence.forEach((node, idx) => {
      if (node.type === "start") {
        nodes.push({ id: "start-0", type: "start", km: 0, name: node.name, rawNode: node });
      } else if (node.type === "waypoint") {
        nodes.push({ id: `wp-${node.km}-${node.name}`, type: "waypoint", km: node.km, name: node.name, rawNode: node });
      } else if (node.type === "charge") {
        const rootKey = keyToStationRoot[node.log.key] || node.log.key;
        const matchedUnique = v.uniqueStationsList?.find(st => st.key === node.log.key) || {};
        const isMergedAway = matchedUnique.isMergedAway;

        if (!isMergedAway) {
          // This is a master station node
          const override = chargingStationOverrides[v.id]?.[rootKey] || {};
          const stationInfo = v.uniqueStationsList?.find(st => st.key === rootKey) || {};
          
          // Gather all stops that are merged into this master station
          const mergedChildren = flowSequence
            .filter(n => n.type === "charge" && (keyToStationRoot[n.log.key] === rootKey) && (n.log.key !== rootKey))
            .map(n => ({
              log: n.log,
              km: n.km,
              unique: v.uniqueStationsList?.find(st => st.key === n.log.key) || {}
            }));

          const masterItem = {
            id: rootKey,
            type: "station",
            km: node.km,
            log: node.log,
            nameOverride: override.name,
            chargerOverride: override.chargers,
            stationInfo,
            mergedChildren,
            rawNode: node
          };
          rawMasterMap[rootKey] = masterItem;
          nodes.push(masterItem);
        }
      }
    });

    // Build edges following logical sequence across master visual nodes
    const edges = [];
    let prevVisualId = null;
    let prevKm = 0;

    flowSequence.forEach(node => {
      let visualId = null;
      if (node.type === "start") visualId = "start-0";
      else if (node.type === "waypoint") visualId = `wp-${node.km}-${node.name}`;
      else if (node.type === "charge") visualId = keyToStationRoot[node.log.key] || node.log.key;

      if (prevVisualId && visualId && prevVisualId !== visualId) {
        edges.push({
          id: `edge-${prevVisualId}-${visualId}-${node.km}`,
          fromId: prevVisualId,
          toId: visualId,
          distance: Math.max(0, Math.round(node.km - prevKm))
        });
      }
      prevVisualId = visualId;
      prevKm = node.km;
    });

    return { masterNodes: nodes, visualEdges: edges };
  }, [flowSequence, chargingStationOverrides, v]);

  // Initial layout calculation / memory recall
  useEffect(() => {
    setPositions(prev => {
      const memory = readFlowMemory();
      const remembered = memory.positions || {};
      const next = { ...remembered, ...prev };
      let changed = false;

      masterNodes.forEach((node, i) => {
        if (!next[node.id]) {
          const defaultX = 60 + (i * 320);
          const defaultY = 100 + ((i % 2) * 110);
          next[node.id] = { x: defaultX, y: defaultY };
          changed = true;
        }
      });

      if (changed) {
        try { localStorage.setItem(memoryStorageKey, JSON.stringify({ positions: next })); } catch (_) {}
        return next;
      }
      return prev;
    });
  }, [masterNodes, memoryStorageKey]);

  const savePositions = useCallback((newPos) => {
    setPositions(newPos);
    try { localStorage.setItem(memoryStorageKey, JSON.stringify({ positions: newPos })); } catch (_) {}
  }, [memoryStorageKey]);

  const autoAlignNodes = () => {
    const next = {};
    masterNodes.forEach((node, i) => {
      const row = Math.floor(i / 4);
      const col = i % 4;
      next[node.id] = {
        x: 60 + (col * 340),
        y: 80 + (row * 240)
      };
    });
    savePositions(next);
    setPan({ x: 40, y: 40 });
    setZoom(1);
  };

  const setZoomClamped = (val) => setZoom(Math.min(2.0, Math.max(0.45, Math.round(val * 100) / 100)));

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === viewportRef.current) await document.exitFullscreen();
      else await viewportRef.current?.requestFullscreen();
    } catch (_) {}
  };

  // Background Panning Handlers
  const handleCanvasMouseDown = (e) => {
    if (e.button !== 0) return; // Left click only
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleCanvasMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (draggingKey) {
      const pos = positions[draggingKey] || { x: 0, y: 0 };
      const newX = (e.clientX - pan.x) / zoom - dragOffset.x;
      const newY = (e.clientY - pan.y) / zoom - dragOffset.y;

      const updated = { ...positions, [draggingKey]: { x: newX, y: newY } };
      setPositions(updated);

      // Check proximity to other master station nodes for seamless merge drop
      const draggingNode = masterNodes.find(n => n.id === draggingKey);
      if (draggingNode && draggingNode.type === "station") {
        let closest = null;
        let minDist = 160;
        masterNodes.forEach(n => {
          if (n.type === "station" && n.id !== draggingKey && positions[n.id]) {
            const dx = positions[n.id].x - newX;
            const dy = positions[n.id].y - newY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
              minDist = dist;
              closest = n.id;
            }
          }
        });
        setHoveredMergeTarget(closest);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isPanning) setIsPanning(false);
    if (draggingKey) {
      if (hoveredMergeTarget) {
        updateChargingStationOverride(v.id, draggingKey, "mergedInto", hoveredMergeTarget);
      }
      savePositions(positions);
      setDraggingKey(null);
      setHoveredMergeTarget(null);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoomClamped(zoom + zoomDelta);
  };

  const startDraggingNode = (e, nodeId) => {
    e.stopPropagation();
    const pos = positions[nodeId] || { x: 0, y: 0 };
    setDraggingKey(nodeId);
    setDragOffset({
      x: (e.clientX - pan.x) / zoom - pos.x,
      y: (e.clientY - pan.y) / zoom - pos.y
    });
  };

  const getNodeWidth = (node) => (node.type === "station" ? 300 : 180);

  return (
    <div ref={viewportRef} className="flow-canvas-viewport">
      {/* High-Tech Top Control Bar */}
      <div className="flow-canvas-toolbar">
        <div className="flow-canvas-help">
          <div className="status-dot-pulse" />
          <span><strong>EV Charging & Route Topology</strong> · Drag nodes to layout · Drag a charger onto another charger to merge infrastructure</span>
        </div>
        <div className="flow-canvas-controls">
          <div className="flow-mode-toggle">
            <button className={flowchartMode === "interactive" ? "active" : ""} onClick={() => setFlowchartMode("interactive")}><Move size={12} /> Canvas View</button>
            <button className={flowchartMode === "standard" ? "active" : ""} onClick={() => setFlowchartMode("standard")}><Route size={12} /> Pipeline Flow</button>
          </div>
          {flowchartMode === "interactive" && (
            <>
              <button className="mini-btn-outline" onClick={() => setZoomClamped(zoom - 0.1)} title="Zoom Out"><ZoomOut size={13} /></button>
              <span className="flow-zoom-label">{Math.round(zoom * 100)}%</span>
              <button className="mini-btn-outline" onClick={() => setZoomClamped(zoom + 0.1)} title="Zoom In"><ZoomIn size={13} /></button>
              <button className="mini-btn-outline" onClick={autoAlignNodes} title="Auto Align Grid"><Sparkles size={13} /> Align</button>
            </>
          )}
          <button className="mini-btn-outline" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* MODE 1: AUTO-WRAPPING PIPELINE FLOW (Clean Left-To-Right with wrapping) */}
      {flowchartMode === "standard" ? (
        <div className="standard-pipeline-viewport">
          <div className="standard-pipeline-wrap">
            {masterNodes.map((node, i) => {
              const prevEdge = visualEdges.find(e => e.toId === node.id);
              return (
                <React.Fragment key={`pipeline-${node.id}`}>
                  {i > 0 && (
                    <div className="pipeline-connector-pill">
                      <div className="pipeline-line" />
                      <span className="pipeline-distance-chip">
                        <ArrowRight size={10} style={{ display: "inline", verticalAlign: "-1px", marginRight: 3 }} />
                        {prevEdge ? prevEdge.distance : (node.km - (masterNodes[i-1]?.km || 0))} km
                      </span>
                    </div>
                  )}

                  <div className={`pipeline-card ${node.type === 'station' ? 'station' : node.type === 'start' ? 'start' : 'waypoint'}`}>
                    {node.type === "start" && (
                      <div className="pipeline-card-inner">
                        <div className="pipeline-header">
                          <span className="cyber-badge badge-good">START NODE</span>
                          <span className="num" style={{ fontSize: "11px", color: "var(--text-dim)" }}>0 km</span>
                        </div>
                        <div className="pipeline-title">{node.name}</div>
                        <div className="pipeline-footer-stat">Depart with 100% SoC</div>
                      </div>
                    )}

                    {node.type === "waypoint" && (
                      <div className="pipeline-card-inner">
                        <div className="pipeline-header">
                          <span className="cyber-badge badge-muted">LOAD / UNLOAD</span>
                          <span className="num" style={{ fontSize: "11px", color: "var(--text-dim)" }}>{node.km} km</span>
                        </div>
                        <div className="pipeline-title">{node.name}</div>
                        <div className="pipeline-footer-stat">Turnaround Stop</div>
                      </div>
                    )}

                    {node.type === "station" && (
                      <div className="pipeline-card-inner">
                        <div className="pipeline-header">
                          <span className={`cyber-badge ${node.log.isDepot ? "badge-info" : "badge-warn"}`}>
                            {node.log.isDepot ? "TERMINAL DEPOT" : "FAST CHARGER"}
                          </span>
                          <span className="num" style={{ fontSize: "11px", color: "var(--text-dim)" }}>{node.km} km</span>
                        </div>

                        <div style={{ display: "flex", gap: "10px", alignItems: "center", margin: "8px 0" }}>
                          <CircularSoc soc={node.log.socBefore} color={node.log.isDepot ? "var(--bev)" : "var(--diesel)"} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <input
                              type="text"
                              className="cyber-input"
                              value={typeof node.nameOverride === "string" ? node.nameOverride : ""}
                              placeholder={node.stationInfo.originalLabel || node.log.label}
                              onChange={(e) => updateChargingStationOverride(v.id, node.id, "name", e.target.value)}
                            />
                            <div className="num" style={{ fontSize: "11px", color: "var(--bev)", marginTop: "4px" }}>
                              {node.log.socBefore}% → 100% SoC
                            </div>
                          </div>
                        </div>

                        {/* Plugs configuration */}
                        <div className="station-meta-row">
                          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>Dispensers:</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <input
                              type="number" min="0" step="1"
                              className="cyber-input-mini"
                              value={Number.isFinite(node.chargerOverride) ? node.chargerOverride : (node.stationInfo.autoChargersSized ?? 1)}
                              onChange={(e) => updateChargingStationOverride(v.id, node.id, "chargers", Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
                            />
                            <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>(Auto: {node.stationInfo.autoChargersSized ?? 1})</span>
                          </div>
                        </div>

                        <div className="station-meta-row">
                          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>Infra Capex:</span>
                          <strong className="num" style={{ fontSize: "11px", color: "var(--bev)" }}>
                            {inr((node.stationInfo.stationSetupCost || 0) + (node.stationInfo.chargersCostSum || 0))}
                          </strong>
                        </div>

                        {/* Merged Children Section inside same card */}
                        {node.mergedChildren && node.mergedChildren.length > 0 && (
                          <div className="merged-group-box">
                            <div className="merged-group-title">
                              <Link2 size={11} color="var(--bev)" />
                              <span>Merged Route Passes ({node.mergedChildren.length}):</span>
                            </div>
                            {node.mergedChildren.map(child => (
                              <div key={child.log.key} className="merged-child-row">
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: "11px" }}>{child.log.label}</div>
                                  <div className="num" style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                                    {child.km} km · {child.log.socBefore}% → 100%
                                  </div>
                                </div>
                                <button
                                  className="cyber-unlink-btn"
                                  onClick={() => updateChargingStationOverride(v.id, child.log.key, "mergedInto", null)}
                                  title="Unmerge this stop"
                                >
                                  <Unlink size={11} /> Unlink
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ) : (
        /* MODE 2: HIGH PRECISION INTERACTIVE CANVAS */
        <div
          className={`interactive-canvas-surface ${isPanning ? 'is-panning' : ''}`}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onWheel={handleWheel}
        >
          <div
            className="interactive-transform-layer"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0"
            }}
          >
            {/* SVG Connecting Curves */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: 4000, height: 3000, pointerEvents: "none", zIndex: 1 }}>
              <defs>
                <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--bev)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="var(--cyber-blue)" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              {visualEdges.map((edge) => {
                const p1 = positions[edge.fromId];
                const p2 = positions[edge.toId];
                if (!p1 || !p2) return null;

                const node1 = masterNodes.find(n => n.id === edge.fromId);
                const node2 = masterNodes.find(n => n.id === edge.toId);
                const w1 = node1 ? getNodeWidth(node1) : 200;
                const w2 = node2 ? getNodeWidth(node2) : 200;

                const x1 = p1.x + (w1 / 2);
                const y1 = p1.y + 70;
                const x2 = p2.x + (w2 / 2);
                const y2 = p2.y + 70;

                const dx = Math.abs(x2 - x1);
                const path = `M ${x1} ${y1} C ${x1 + dx * 0.45} ${y1}, ${x2 - dx * 0.45} ${y2}, ${x2} ${y2}`;

                return (
                  <g key={edge.id}>
                    <path d={path} stroke="url(#edgeGradient)" strokeWidth="2.5" fill="none" strokeDasharray="6 4" opacity="0.75" />
                    <circle cx={x2} cy={y2} r="4" fill="var(--bev)" />
                    <rect x={(x1 + x2) / 2 - 32} y={(y1 + y2) / 2 - 12} width="64" height="22" rx="6" fill="#0d121d" stroke="var(--border)" />
                    <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + 3} fill="var(--text-dim)" fontSize="10" fontWeight="700" textAnchor="middle" style={{ fontFamily: "JetBrains Mono" }}>
                      {edge.distance} km
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Draggable Master Cards */}
            {masterNodes.map((node) => {
              const pos = positions[node.id] || { x: 0, y: 0 };
              const isHoverTarget = hoveredMergeTarget === node.id;
              const isDraggingThis = draggingKey === node.id;
              const w = getNodeWidth(node);

              return (
                <div
                  key={node.id}
                  className={`canvas-node-card ${node.type} ${isHoverTarget ? "merge-drop-hover" : ""} ${isDraggingThis ? "is-dragging" : ""}`}
                  style={{
                    transform: `translate(${pos.x}px, ${pos.y}px)`,
                    width: w,
                    zIndex: isDraggingThis ? 50 : 10
                  }}
                  onMouseDown={(e) => startDraggingNode(e, node.id)}
                >
                  {node.type === "start" && (
                    <div className="canvas-card-body">
                      <div className="card-top-bar">
                        <span className="cyber-badge badge-good">START NODE</span>
                        <span className="num" style={{ fontSize: "10px", color: "var(--text-dim)" }}>0 km</span>
                      </div>
                      <div className="node-title">{node.name}</div>
                      <div className="node-sub">Full Initial Departure SoC (100%)</div>
                    </div>
                  )}

                  {node.type === "waypoint" && (
                    <div className="canvas-card-body">
                      <div className="card-top-bar">
                        <span className="cyber-badge badge-muted">WAYPOINT</span>
                        <span className="num" style={{ fontSize: "10px", color: "var(--text-dim)" }}>{node.km} km</span>
                      </div>
                      <div className="node-title">{node.name}</div>
                      <div className="node-sub">Cargo Load/Unload Turnaround</div>
                    </div>
                  )}

                  {node.type === "station" && (
                    <div className="canvas-card-body">
                      <div className="card-top-bar">
                        <span className={`cyber-badge ${node.log.isDepot ? "badge-info" : "badge-warn"}`}>
                          {node.log.isDepot ? "DEPOT TERMINAL" : "HIGHWAY CHARGER"}
                        </span>
                        <span className="num" style={{ fontSize: "10px", color: "var(--text-dim)" }}>{node.km} km</span>
                      </div>

                      <div style={{ display: "flex", gap: "10px", alignItems: "center", margin: "6px 0 10px" }}>
                        <CircularSoc soc={node.log.socBefore} color={node.log.isDepot ? "var(--bev)" : "var(--diesel)"} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <input
                            type="text"
                            className="cyber-input"
                            value={typeof node.nameOverride === "string" ? node.nameOverride : ""}
                            placeholder={node.stationInfo.originalLabel || node.log.label}
                            onMouseDown={(e) => e.stopPropagation()}
                            onChange={(e) => updateChargingStationOverride(v.id, node.id, "name", e.target.value)}
                          />
                          <div className="num" style={{ fontSize: "10.5px", color: "var(--bev)", marginTop: "4px" }}>
                            {node.log.socBefore}% → 100% SoC
                          </div>
                        </div>
                      </div>

                      <div className="station-meta-row">
                        <span style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>Plugs (Auto: {node.stationInfo.autoChargersSized ?? 1}):</span>
                        <input
                          type="number" min="0" step="1"
                          className="cyber-input-mini"
                          value={Number.isFinite(node.chargerOverride) ? node.chargerOverride : (node.stationInfo.autoChargersSized ?? 1)}
                          onMouseDown={(e) => e.stopPropagation()}
                          onChange={(e) => updateChargingStationOverride(v.id, node.id, "chargers", Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
                        />
                      </div>

                      <div className="station-meta-row" style={{ borderBottom: "none", paddingBottom: 0 }}>
                        <span style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>Station Capex:</span>
                        <strong className="num" style={{ fontSize: "11px", color: "var(--bev)" }}>
                          {inr((node.stationInfo.stationSetupCost || 0) + (node.stationInfo.chargersCostSum || 0))}
                        </strong>
                      </div>

                      {/* CONSOLIDATED MERGED STATIONS SECTION INSIDE SAME CARD */}
                      {node.mergedChildren && node.mergedChildren.length > 0 && (
                        <div className="merged-group-box">
                          <div className="merged-group-title">
                            <Link2 size={11} color="var(--bev)" />
                            <span>Linked Passes ({node.mergedChildren.length}):</span>
                          </div>
                          {node.mergedChildren.map(child => (
                            <div key={child.log.key} className="merged-child-row">
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {child.log.label}
                                </div>
                                <div className="num" style={{ fontSize: "9.5px", color: "var(--text-dim)" }}>
                                  {child.km} km · {child.log.socBefore}% → 100%
                                </div>
                              </div>
                              <button
                                className="cyber-unlink-btn"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={() => updateChargingStationOverride(v.id, child.log.key, "mergedInto", null)}
                                title="Unmerge this pass"
                              >
                                <Unlink size={10} /> Unlink
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ... INITIAL_VEHICLES logic
const INITIAL_VEHICLES = [
  {
    id: "v-diesel-1", name: "Standard Diesel 55T", type: "diesel", purchasePrice: 4000000, gstRate: 18, registrationFee: 135000,
    trailerCost: 1800000, vehicleMiscCost: 0, tractorWeight: 8000, trailerWeight: 9000, gvwr: 55000,
    baseUnloadedEconomy: 4, baseLoadedEconomy: 3, fuelOrElectricPrice: 96, fuelCapacityLitres: 365,
    safeFuelThreshold: 5, refuelTimeMins: 20, maintCostPerKm: 2.5, insuranceRatePct: 1.5, residualPct: 10,
    allowOverloading: false, overloadPenaltyPctPerTonne: 2.0, financing: "emi", downPaymentPct: 20,
    interestRate: 10, loanTenure: 7, driverSalaryMonthly: 45000, driversPerVehicle: 2, tollCostPerTrip: 7350,
    tyresFront: 2, tyreCostFront: 21000, tyreLifeFront: 45000, tyresRear: 4, tyreCostRear: 22000, tyreLifeRear: 50000,
    tyresTrailer: 12, tyreCostTrailer: 22000, tyreLifeTrailer: 65000, driverRestDelayFactorKm: 200,
    scheduledDowntimeDays: 12, unscheduledDowntimeHrs: 48, miscCostPerMonth: 10000, miscCostNotes: "Chai/Paani", operatorMarginPerTruckMonthly: 25000,
  },
  {
    id: "v-bev-1", name: "Electric BEV 55T", type: "electric", purchasePrice: 9000000, gstRate: 5, registrationFee: 135000,
    trailerCost: 1800000, vehicleMiscCost: 0, tractorWeight: 9500, trailerWeight: 9000, gvwr: 55000,
    baseUnloadedEconomy: 0.6, baseLoadedEconomy: 0.31, batteryCapacity: 282, batteryReplacementCost: 4000000,
    refCycleLifeAt100DoD: 6000, dodStressExponentK: 1.3, kneeSOH: 88, kneeCycleFraction: 0.7, postKneeExponent: 1.6,
    batterySOHThreshold: 75, maintCostPerKm: 2.5, insuranceRatePct: 1.5,
    residualPct: 7, allowOverloading: false, overloadPenaltyPctPerTonne: 2.0, financing: "emi", downPaymentPct: 20,
    interestRate: 10.0, loanTenure: 7, driverSalaryMonthly: 45000, driversPerVehicle: 2, tollCostPerTrip: 7350,
    tyresFront: 2, tyreCostFront: 21000, tyreLifeFront: 45000, tyresRear: 4, tyreCostRear: 22000, tyreLifeRear: 50000,
    tyresTrailer: 12, tyreCostTrailer: 22000, tyreLifeTrailer: 65000, scheduledDowntimeDays: 12, unscheduledDowntimeHrs: 48,
    safeSoCThreshold: 10, stationCost: 2500000, chargerCost: 1500000, defaultChargersPerStation: 1,
    infrastructureTaxCredit: 0, chargeSpeedKW: 225, chargingTimeMarginPct: 10, electricityRate: 5, depotLandLeaseMonthly: 0,
    costPerManpower: 25000, opsInchargeCount: 2, opsInchargeCost: 70000, supportingManpowerCount: 6, supportingManpowerCost: 40000,
    useDynamicSOHLimit: true, driverRestDelayFactorKm: 200, miscCostPerMonth: 10000, miscCostNotes: "Chai/Paani", operatorMarginPerTruckMonthly: 25000,
  }
];

// ---------------------------------------------------------------------------
// CORE COMPUTATION ENGINE
// ---------------------------------------------------------------------------
function computeVehicleMetrics(v, routeSegments, cfg, chargingStationOverrides, dieselMatrix, evMatrix) {
  const {
    years, dfRate,
    escF, escE, escAMC, escToll, escTyre, escMisc, escIns, escW, escLand,
    workingDaysPerMonth, loadingUnloadingTimePerTrip
  } = cfg;
  
  const dailyOperatingLimitHrs = 24;
  const payloadCap = getPayloadCap(v);
  let tripMaxPayload = 0;
  let totalTripDistance = 0;
  let totalTripDrivingHrs = 0;
  let weightedEnergyNeeded = 0;

  const segmentOverloads = [];
  const segmentEconomies = [];
  const segmentDrivingHours = [];
  const segmentCappedPayloads = [];

  routeSegments.forEach((seg, idx) => {
    totalTripDistance += seg.distance;
    const segHrs = seg.distance / Math.max(1, seg.avgSpeed);
    totalTripDrivingHrs += segHrs;
    segmentDrivingHours.push(segHrs);
    
    const segPayload = getSegPayload(seg, v.id);
    if (segPayload > tripMaxPayload) tripMaxPayload = segPayload;
    
    if (segPayload > payloadCap && !v.allowOverloading) {
      segmentOverloads.push({ segmentIdx: idx + 1, payload: segPayload, cap: payloadCap, from: seg.from, to: seg.to });
    }

    const cappedPayload = v.allowOverloading ? segPayload : Math.min(segPayload, payloadCap);
    const standardPayload = Math.min(cappedPayload, payloadCap);
    const payloadRatio = payloadCap > 0 ? standardPayload / payloadCap : 0;
    segmentCappedPayloads.push(cappedPayload);

    let baseEconomy = v.baseUnloadedEconomy - (v.baseUnloadedEconomy - v.baseLoadedEconomy) * payloadRatio;
    
    const overloadTonnes = Math.max(0, cappedPayload - payloadCap);
    if (overloadTonnes > 0 && v.overloadPenaltyPctPerTonne) {
      const penaltyFactor = 1 - (overloadTonnes * (v.overloadPenaltyPctPerTonne / 100));
      baseEconomy = baseEconomy * Math.max(0.1, penaltyFactor); 
    }

    const segWeightedMultiplier = computeWeightedMultiplier(seg.stretches, cappedPayload, v.type, dieselMatrix, evMatrix);
    const segVehicleEconomy = baseEconomy * segWeightedMultiplier;

    segmentEconomies.push(segVehicleEconomy);
    weightedEnergyNeeded += seg.distance / Math.max(0.01, segVehicleEconomy);
  });

  const avgRouteEconomy = weightedEnergyNeeded > 0 ? totalTripDistance / weightedEnergyNeeded : 1.0;

  let tonneKmPerTrip = 0;
  routeSegments.forEach((seg, idx) => {
    tonneKmPerTrip += segmentCappedPayloads[idx] * seg.distance;
  });

  let stopsLog = [];
  let uniqueChargingStopsMap = {};
  let criticalSOHLimit = 20.0;
  let maxEnergyLegKWh = 0;
  let chargingDowntimeHrs = 0;
  let refuelingDowntimeHrs = 0;
  let refuelingStopsCount = 0;

  if (v.type === "electric" && v.batteryCapacity > 0) {
    let currentSoC = 100;
    let cumulativeDistance = 0;
    let currentEnergySinceCharge = 0;
    let lastChargedFromSoC = 100;

    const designSOHLimit = v.batterySOHThreshold || 75;
    const plannedEffectiveCapacity = v.batteryCapacity * (designSOHLimit / 100);

    const recordChargeStop = (label, km, socBefore, chargeToSoC, isDepot) => {
      const energyReplenishedKWh = Math.max(0, ((chargeToSoC - socBefore) / 100) * plannedEffectiveCapacity);
      const baseChargeTimeHrs = energyReplenishedKWh / Math.max(1, v.chargeSpeedKW || 150);
      const finalChargeTimeHrs = baseChargeTimeHrs * (1 + ((v.chargingTimeMarginPct || 0) / 100));

      chargingDowntimeHrs += finalChargeTimeHrs;

      const uniqueKey = `${label}_${Math.round(km)}`;
      stopsLog.push({
        key: uniqueKey, label, km: Math.round(km), socBefore: socBefore.toFixed(1), socAfter: chargeToSoC, isDepot,
        energyLegConsumed: currentEnergySinceCharge, startSoCWindow: lastChargedFromSoC, chargeTimeHrs: finalChargeTimeHrs
      });

      if (!uniqueChargingStopsMap[uniqueKey]) {
        uniqueChargingStopsMap[uniqueKey] = {
          key: uniqueKey, label, km: Math.round(km), isDepot, chargesPerLoop: 0, timePerChargeHrs: finalChargeTimeHrs,
          energyReplenishedKWh
        };
      }
      uniqueChargingStopsMap[uniqueKey].chargesPerLoop += 1;
      uniqueChargingStopsMap[uniqueKey].timePerChargeHrs = Math.max(uniqueChargingStopsMap[uniqueKey].timePerChargeHrs, finalChargeTimeHrs);

      if (currentEnergySinceCharge > maxEnergyLegKWh) maxEnergyLegKWh = currentEnergySinceCharge;

      const usableSoCWindow = (lastChargedFromSoC - v.safeSoCThreshold) / 100;
      const reqSOHPercent = (currentEnergySinceCharge / (v.batteryCapacity * usableSoCWindow)) * 100;
      if (reqSOHPercent > criticalSOHLimit) criticalSOHLimit = Math.min(100, Math.max(criticalSOHLimit, reqSOHPercent));

      currentEnergySinceCharge = 0;
      lastChargedFromSoC = chargeToSoC;
    };

    routeSegments.forEach((seg, idx) => {
      const segVehicleEconomy = segmentEconomies[idx];
      const safeEconomy = Math.max(0.01, segVehicleEconomy);
      const safeCapacity = Math.max(1, plannedEffectiveCapacity);
      const socPctPerKm = 100 / (safeEconomy * safeCapacity);

      let remainingSegDistance = seg.distance;

      while (remainingSegDistance > 0.001) {
        const availableSoC = currentSoC - v.safeSoCThreshold;
        const maxDistanceBeforeCharge = socPctPerKm > 0 ? Math.max(0, availableSoC / socPctPerKm) : remainingSegDistance;

        if (maxDistanceBeforeCharge >= remainingSegDistance) {
          const energyConsumed = remainingSegDistance / safeEconomy;
          currentEnergySinceCharge += energyConsumed;
          currentSoC -= remainingSegDistance * socPctPerKm;
          cumulativeDistance += remainingSegDistance;
          remainingSegDistance = 0;
        } else {
          const travelDist = maxDistanceBeforeCharge;
          if (travelDist <= 0.0001) { remainingSegDistance = 0; break; }

          const energyConsumed = travelDist / safeEconomy;
          currentEnergySinceCharge += energyConsumed;
          currentSoC -= travelDist * socPctPerKm;
          cumulativeDistance += travelDist;
          remainingSegDistance -= travelDist;

          recordChargeStop(`Mid-Segment Fast Charger (${seg.from} → ${seg.to})`, cumulativeDistance, currentSoC, 100, false);
          currentSoC = 100;
        }
      }
      if (seg.hasDepotAtTo) {
        recordChargeStop(`Terminal Depot (${seg.to})`, cumulativeDistance, currentSoC, 100, true);
        currentSoC = 100;
      }
    });

    if (currentEnergySinceCharge > 0) recordChargeStop(`Home Base Depot Terminal`, cumulativeDistance, currentSoC, 100, true);
  } else if (v.type === "diesel" && v.fuelCapacityLitres > 0) {
    let totalFuelConsumed = 0;
    routeSegments.forEach((seg, idx) => {
      totalFuelConsumed += seg.distance / Math.max(0.01, segmentEconomies[idx]);
    });
    const usableFuel = v.fuelCapacityLitres * (1 - ((v.safeFuelThreshold || 15) / 100));
    refuelingStopsCount = totalFuelConsumed / Math.max(1, usableFuel);
    refuelingDowntimeHrs = refuelingStopsCount * ((v.refuelTimeMins || 20) / 60);
  }

  const safeDelayFactor = Math.max(1, v.driverRestDelayFactorKm || 200);
  const generalRestDowntimeHrs = totalTripDistance / safeDelayFactor;

  const resolvedSOHReplacementLimit = (v.type === "electric" && v.useDynamicSOHLimit)
    ? Math.min(95, Math.max(v.batterySOHThreshold, criticalSOHLimit))
    : (v.batterySOHThreshold || 75);

  let avgDoDFraction = (100 - (v.safeSoCThreshold || 10)) / 100;
  let cyclesToEOL = 1;
  if (v.type === "electric") {
    let totalDoDWeighted = 0;
    let totalLegEnergy = 0;
    stopsLog.forEach((log) => {
      const dodEvent = Math.max(0.01, (log.startSoCWindow - parseFloat(log.socBefore)) / 100);
      totalDoDWeighted += dodEvent * Math.max(0.0001, log.energyLegConsumed);
      totalLegEnergy += Math.max(0.0001, log.energyLegConsumed);
    });
    if (totalLegEnergy > 0) avgDoDFraction = totalDoDWeighted / totalLegEnergy;
    cyclesToEOL = cycleLifeForDoD(v.refCycleLifeAt100DoD, avgDoDFraction, v.dodStressExponentK);
  }

  const chargingStopsCount = stopsLog.length;
  const totalAnnualFixedDowntimeHrs = (v.scheduledDowntimeDays * 24) + v.unscheduledDowntimeHrs;
  const fullTurnaroundCycleHrs = totalTripDrivingHrs + loadingUnloadingTimePerTrip + chargingDowntimeHrs + refuelingDowntimeHrs + generalRestDowntimeHrs;

  const utilizationPctComputed = fullTurnaroundCycleHrs > 0
    ? (totalTripDrivingHrs / fullTurnaroundCycleHrs) * 100
    : 0;

  const totalOperatingHoursAvailableYear = (workingDaysPerMonth * 12 * dailyOperatingLimitHrs) - totalAnnualFixedDowntimeHrs;
  const tripsPerYearPerVehicle = fullTurnaroundCycleHrs > 0 ? totalOperatingHoursAvailableYear / fullTurnaroundCycleHrs : 0;

  const segmentDemandTripsNeededPerYear = routeSegments.map((seg, idx) => {
    const demandMonthly = seg.monthlyTonnage || 0;
    const segPayload = segmentCappedPayloads[idx];
    if (demandMonthly <= 0 || segPayload <= 0) return 0;
    const dailyDemand = demandMonthly / Math.max(1, workingDaysPerMonth);
    const dailyDispatches = Math.ceil(dailyDemand / segPayload); 
    return dailyDispatches * workingDaysPerMonth * 12;
  });
  const usesSegmentDemand = segmentDemandTripsNeededPerYear.some((x) => x > 0);
  const bottleneckTripsNeededPerYear = Math.max(0, ...segmentDemandTripsNeededPerYear);

  let fleetSizeRequired = usesSegmentDemand
    ? Math.max(1, Math.ceil(bottleneckTripsNeededPerYear / Math.max(0.01, tripsPerYearPerVehicle)))
    : 1;

  const totalTripsAcrossFleetYear = tripsPerYearPerVehicle * fleetSizeRequired;
  const totalDistanceAcrossFleetYear = totalTripsAcrossFleetYear * totalTripDistance;
  const annualTonneKmPerVehicle = tripsPerYearPerVehicle * tonneKmPerTrip;
  const annualTonneKmFleet = annualTonneKmPerVehicle * fleetSizeRequired;
  const annualCyclesPerVehicle = tripsPerYearPerVehicle * chargingStopsCount;

  let uniqueStationsCount = 0;
  let totalChargersNeeded = 0;
  let capitalSetupInfra = 0;
  let uniqueStationsList = [];

  if (v.type === "electric") {
    const defaultBaselinePlugs = Math.max(1, v.defaultChargersPerStation || 1);
    const STATION_DAILY_UPTIME_HRS = 22;
    const dailyLoopsAcrossFleet = totalTripsAcrossFleetYear / (workingDaysPerMonth * 12);
    const vehicleOverrides = chargingStationOverrides[v.id] || {};
    const stationKeys = Object.keys(uniqueChargingStopsMap);

    const rootOfKey = {};
    const demandByKey = {};
    stationKeys.forEach((key) => {
      const rawStop = uniqueChargingStopsMap[key];
      demandByKey[key] = dailyLoopsAcrossFleet * rawStop.chargesPerLoop;
      const ov = vehicleOverrides[key] || {};
      const target = ov.mergedInto;
      rootOfKey[key] = (target && target !== key && uniqueChargingStopsMap[target]) ? target : key;
    });
    const combinedDemandByRoot = {};
    stationKeys.forEach((key) => {
      const root = rootOfKey[key];
      combinedDemandByRoot[root] = (combinedDemandByRoot[root] || 0) + demandByKey[key];
    });

    stationKeys.forEach((key) => {
      const rawStop = uniqueChargingStopsMap[key];
      const stopOverride = vehicleOverrides[key] || {};
      const root = rootOfKey[key];
      const isMergedAway = root !== key;

      const chargeSlotsPerDayPerCharger = STATION_DAILY_UPTIME_HRS / Math.max(0.1, rawStop.timePerChargeHrs);
      const combinedDemand = combinedDemandByRoot[root] || 0;
      const autoCalculatedDemandPlugs = Math.max(1, Math.ceil(combinedDemand / chargeSlotsPerDayPerCharger));
      const autoChargersSized = isMergedAway ? 0 : Math.max(1, autoCalculatedDemandPlugs, defaultBaselinePlugs);

      const hasChargerOverride = Number.isFinite(stopOverride.chargers);
      const chargersSized = isMergedAway ? 0 : (hasChargerOverride ? Math.max(0, Math.round(stopOverride.chargers)) : autoChargersSized);
      const displayLabel = typeof stopOverride.name === "string" && stopOverride.name.trim() ? stopOverride.name.trim() : rawStop.label;
      const mergedIntoLabel = isMergedAway ? ((uniqueChargingStopsMap[root] || {}).label) : null;

      if (chargersSized > 0) {
        uniqueStationsCount += 1;
        totalChargersNeeded += chargersSized;
        capitalSetupInfra += (v.stationCost + (chargersSized * v.chargerCost)) * (1 - (v.infrastructureTaxCredit || 0) / 100);
      }

      uniqueStationsList.push({
        ...rawStop, label: displayLabel, originalLabel: rawStop.label, chargersSized, autoChargersSized,
        isManualChargerOverride: hasChargerOverride && !isMergedAway, isManualNameOverride: displayLabel !== rawStop.label,
        isMergedAway, mergedIntoKey: isMergedAway ? root : null, mergedIntoLabel,
        stationSetupCost: chargersSized > 0 ? v.stationCost : 0, chargersCostSum: chargersSized * v.chargerCost
      });
    });
  }

  const autoStationManpower = v.type === "electric" 
    ? Math.max(0, (uniqueStationsCount > 2 ? (uniqueStationsCount - 2) * 3 : uniqueStationsCount * 3))
    : 0;
  const costPerManpower = v.costPerManpower || 25000;
  const opsInchargeCount = v.opsInchargeCount !== undefined ? v.opsInchargeCount : 2;
  const opsInchargeCost = v.opsInchargeCost || 70000;
  const supportingManpowerCount = v.supportingManpowerCount !== undefined ? v.supportingManpowerCount : 6;
  const supportingManpowerCost = v.supportingManpowerCost || 40000;

  const totalMonthlyStationManpower = (autoStationManpower * costPerManpower) + (opsInchargeCount * opsInchargeCost) + (supportingManpowerCount * supportingManpowerCost);

  const vehicleCostBeforeGSTAddOns = v.purchasePrice * (1 + v.gstRate / 100);
  const totalUpfrontGSTPrice = vehicleCostBeforeGSTAddOns + (v.registrationFee || 0) + (v.trailerCost || 0) + (v.vehicleMiscCost || 0);
  let loanUpfrontDownpayment = totalUpfrontGSTPrice;
  let loanAnnualEMI = 0;
  let loanPrincipalDebt = 0;

  if (v.financing === "emi" && v.loanTenure > 0) {
    loanUpfrontDownpayment = totalUpfrontGSTPrice * (v.downPaymentPct / 100);
    loanPrincipalDebt = Math.max(0, totalUpfrontGSTPrice - loanUpfrontDownpayment);
    const monthlyRate = v.interestRate / 1200;
    const totalMonths = v.loanTenure * 12;
    loanAnnualEMI = (monthlyRate > 0 ? (loanPrincipalDebt * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1) : loanPrincipalDebt / totalMonths) * 12;
  }

  let npvTCOSum = (loanUpfrontDownpayment * fleetSizeRequired) + capitalSetupInfra;
  let cumCostTimeline = [npvTCOSum];

  const totalFleetUpfrontCapex = (loanUpfrontDownpayment * fleetSizeRequired) + capitalSetupInfra;
  const infraCapexPerTruck = fleetSizeRequired > 0 ? capitalSetupInfra / fleetSizeRequired : 0;
  const loadedCapexPerTruckOnRoad = totalUpfrontGSTPrice + infraCapexPerTruck;
  const loadedCapexPerTruckEquity = loanUpfrontDownpayment + infraCapexPerTruck;
  const totalFleetOnRoadCapex = (totalUpfrontGSTPrice * fleetSizeRequired) + capitalSetupInfra;

  const breakdown = {
    upfront: npvTCOSum, fuelOrEnergy: 0, emi: 0, maintenance: 0, insurance: 0, wages: 0, tolls: 0, tyres: 0,
    batteryReplacements: 0, stationManpower: 0, infraLandLease: 0, misc: 0, residuals: 0, operatorMargin: 0
  };

  let currentSOH = 100;
  let cyclesSinceLastReplacement = 0;
  let batterySetsReplacedCount = 0;
  let batteryReplacementLog = [];
  let sohTimeline = [];
  let rangeTimeline = [];
  let npvMarginTarget = 0;
  let discountedCargoTonneKm = 0;
  let discountedCargoTonnes = 0;

  const cargoTonnesPerTrip = routeSegments.reduce(
    (sum, seg, idx) => sum + Math.max(0, segmentCappedPayloads[idx]),
    0
  );
  const annualCargoTonnesFleet = totalTripsAcrossFleetYear * cargoTonnesPerTrip;

  const baseTheoreticalRange = v.type === "electric" ? v.batteryCapacity * avgRouteEconomy : (v.type === "diesel" ? v.fuelCapacityLitres * avgRouteEconomy : 0);
  const baseOperationalRangeAtStart = v.type === "electric" ? v.batteryCapacity * ((100 - (v.safeSoCThreshold || 0)) / 100) * avgRouteEconomy : 0;

  for (let t = 1; t <= years; t++) {
    const df = dfRate > 0 ? 1 / Math.pow(1 + dfRate, t) : 1;
    discountedCargoTonneKm += annualTonneKmFleet * df;
    discountedCargoTonnes += annualCargoTonnesFleet * df;

    const multF = Math.pow(1 + escF, t - 1);
    const multE = Math.pow(1 + escE, t - 1);
    const multAMC = Math.pow(1 + escAMC, t - 1);
    const multToll = Math.pow(1 + escToll, t - 1);
    const multTyre = Math.pow(1 + escTyre, t - 1);
    const multMisc = Math.pow(1 + escMisc, t - 1);
    const multIns = Math.pow(1 + escIns, t - 1);
    const multW = Math.pow(1 + escW, t - 1);
    const multLand = Math.pow(1 + escLand, t - 1);

    const yearEMI = (v.financing === "emi" && t <= v.loanTenure) ? loanAnnualEMI * fleetSizeRequired : 0;
    const yearFuelOrEnergy = (totalDistanceAcrossFleetYear / avgRouteEconomy) * (v.type === "diesel" ? (v.fuelOrElectricPrice * multF) : (v.electricityRate * multE));
    const yearMaint = totalDistanceAcrossFleetYear * v.maintCostPerKm * multAMC;
    const idvFactor = years > 0 ? (1 - ((1 - v.residualPct / 100) * (t - 1) / years)) : 1;
    const yearIns = totalUpfrontGSTPrice * Math.max(v.residualPct / 100, idvFactor) * (v.insuranceRatePct / 100) * multIns * fleetSizeRequired;
    const yearWages = v.driverSalaryMonthly * 12 * Math.max(1, v.driversPerVehicle || 1) * multW * fleetSizeRequired;
    const yearTolls = v.tollCostPerTrip * totalTripsAcrossFleetYear * multToll;
    const yearMisc = (v.miscCostPerMonth || 0) * 12 * multMisc * fleetSizeRequired;
    const yearOperatorMargin = (v.operatorMarginPerTruckMonthly || 0) * 12 * multMisc * fleetSizeRequired;

    const yearTyres = totalDistanceAcrossFleetYear * (
      (v.tyresFront * v.tyreCostFront / Math.max(1, v.tyreLifeFront)) +
      (v.tyresRear * v.tyreCostRear / Math.max(1, v.tyreLifeRear)) +
      (v.tyresTrailer * v.tyreCostTrailer / Math.max(1, v.tyreLifeTrailer))
    ) * multTyre;

    let yearBatteryCost = 0;
    if (v.type === "electric") {
      let availableCycles = annualCyclesPerVehicle;
      while (availableCycles > 0) {
        const cyclesToLimit = cyclesToEOL - cyclesSinceLastReplacement;
        if (availableCycles >= cyclesToLimit) {
          yearBatteryCost += v.batteryReplacementCost * fleetSizeRequired * multAMC;
          batterySetsReplacedCount += fleetSizeRequired;
          batteryReplacementLog.push({
            year: t, sohAtReplacement: resolvedSOHReplacementLimit, cycles: Math.round(cyclesToEOL),
            avgDoDPct: Math.round(avgDoDFraction * 100),
          });
          availableCycles -= cyclesToLimit;
          cyclesSinceLastReplacement = 0;
        } else {
          cyclesSinceLastReplacement += availableCycles;
          availableCycles = 0;
        }
      }
      const cycleFraction = cyclesSinceLastReplacement / Math.max(1, cyclesToEOL);
      currentSOH = sohAtCycleFraction(cycleFraction, v.kneeSOH || 88, v.kneeCycleFraction || 0.7, resolvedSOHReplacementLimit, v.postKneeExponent || 1.6);
      const roundedSOH = Math.round(currentSOH * 10) / 10;
      sohTimeline.push({ year: t, soh: roundedSOH });
      rangeTimeline.push({ year: t, range: Math.round(baseOperationalRangeAtStart * (roundedSOH / 100)) });
    }

    let yearStationManpower = 0;
    let yearLandLease = 0;
    if (v.type === "electric") {
      yearStationManpower = totalMonthlyStationManpower * 12 * multW;
      yearLandLease = (v.depotLandLeaseMonthly || 0) * 12 * multLand;
    }

    const totalYearlyExpenses = yearEMI + yearFuelOrEnergy + yearMaint + yearIns + yearWages + yearTolls + yearTyres + yearBatteryCost + yearStationManpower + yearLandLease + yearMisc;
    npvTCOSum += totalYearlyExpenses * df;
    cumCostTimeline.push(cumCostTimeline[cumCostTimeline.length - 1] + totalYearlyExpenses);

    breakdown.fuelOrEnergy += yearFuelOrEnergy * df;
    breakdown.emi += yearEMI * df;
    breakdown.maintenance += yearMaint * df;
    breakdown.insurance += yearIns * df;
    breakdown.wages += yearWages * df;
    breakdown.tolls += yearTolls * df;
    breakdown.tyres += yearTyres * df;
    breakdown.batteryReplacements += yearBatteryCost * df;
    breakdown.stationManpower += yearStationManpower * df;
    breakdown.infraLandLease += yearLandLease * df;
    breakdown.misc += yearMisc * df;
    breakdown.operatorMargin += yearOperatorMargin * df;

    npvMarginTarget += yearOperatorMargin * df;
  }

  const npvResidualValue = v.purchasePrice * (v.residualPct / 100) * fleetSizeRequired * (dfRate > 0 ? (1 / Math.pow(1 + dfRate, years)) : 1);
  npvTCOSum -= npvResidualValue;
  cumCostTimeline[years] -= v.purchasePrice * (v.residualPct / 100) * fleetSizeRequired;
  breakdown.residuals = -npvResidualValue;

  const totalCargoTonneKmFleet = discountedCargoTonneKm;
  const totalCargoTonnesFleet = discountedCargoTonnes;

  const costPerTonneKm = totalCargoTonneKmFleet > 0
    ? npvTCOSum / totalCargoTonneKmFleet : 0;
  const costPerTonne = totalCargoTonnesFleet > 0
    ? npvTCOSum / totalCargoTonnesFleet : 0;

  const requiredRevenueNPV = npvTCOSum + npvMarginTarget;
  const requiredFreightRatePerTonneKm = totalCargoTonneKmFleet > 0
    ? requiredRevenueNPV / totalCargoTonneKmFleet : 0;
  const requiredFreightRatePerTonne = totalCargoTonnesFleet > 0
    ? requiredRevenueNPV / totalCargoTonnesFleet : 0;

  const operationalRangeAtSOHLimit = v.type === "electric"
    ? baseOperationalRangeAtStart * (resolvedSOHReplacementLimit / 100) : 0;

  const loopTonneKm = tonneKmPerTrip;
  const loopCargoTonnes = cargoTonnesPerTrip;

  const routeDistanceForCost = Math.max(0.0001, routeSegments.reduce((sum, seg) => sum + Math.max(0, seg.distance || 0), 0));
  const loopCostPerTonneTrip = Math.max(0, costPerTonne) + Math.max(0, costPerTonne);
  const loopCostPerTonneKm = loopCostPerTonneTrip / routeDistanceForCost;

  const loopFreightRatePerTonneKm = requiredFreightRatePerTonneKm;
  const totalFreightRatePerTonneTrip = (loopFreightRatePerTonneKm > 0 && loopCargoTonnes > 0)
    ? (loopFreightRatePerTonneKm * loopTonneKm) / loopCargoTonnes
    : 0;

  const segmentCostPerTonneKm = routeSegments.map((seg, idx) => {
    const cappedPayload = segmentCappedPayloads[idx];
    const segEconomy = Math.max(0.01, segmentEconomies[idx]);
    const fuelPricePerUnit = v.type === "diesel" ? v.fuelOrElectricPrice : v.electricityRate;
    const fuelCostPerKm = fuelPricePerUnit / segEconomy;
    const tyreCostPerKmFlat = (v.tyresFront * v.tyreCostFront / Math.max(1, v.tyreLifeFront)) +
      (v.tyresRear * v.tyreCostRear / Math.max(1, v.tyreLifeRear)) +
      (v.tyresTrailer * v.tyreCostTrailer / Math.max(1, v.tyreLifeTrailer));
    const operatingCostPerKm = fuelCostPerKm + v.maintCostPerKm + tyreCostPerKmFlat;

    const costPerTonneSeg = cappedPayload > 0 ? costPerTonneKm * Math.max(0, seg.distance || 0) : null;
    const costPerTonneKmSeg = (costPerTonneSeg !== null && seg.distance > 0) ? costPerTonneSeg / seg.distance : null;
    const freightRatePerTonneKmSeg = cappedPayload > 0 ? loopFreightRatePerTonneKm : null;
    const freightRatePerTonneSeg = cappedPayload > 0 ? loopFreightRatePerTonneKm * seg.distance : null;

    return {
      from: seg.from, to: seg.to, distance: seg.distance, payload: cappedPayload,
      operatingCostPerKm, costPerTonneKmSeg, freightRatePerTonneKmSeg, costPerTonneSeg, freightRatePerTonneSeg
    };
  });

  return {
    ...v, payloadCap, avgRouteEconomy, chargingStopsCount, chargingDowntimeHrs, refuelingDowntimeHrs,
    refuelingStopsCount, generalRestDowntimeHrs, drivingHrs: totalTripDrivingHrs, loadUnloadHrs: loadingUnloadingTimePerTrip,
    utilizationPctComputed, stopsLog, uniqueStationsList, turnaroundCycleHrs: fullTurnaroundCycleHrs,
    fleetSizeRequired, usesSegmentDemand, tripsPerYearPerVehicle, totalTripsAcrossFleetYear, totalDistanceAcrossFleetYear,
    tonneKmPerTrip, annualTonneKmFleet, totalChargersNeeded, uniqueStationsCount, npvTCOSum, cumCostTimeline, breakdown,
    costPerTonne, costPerTonneKm, requiredFreightRatePerTonne, requiredFreightRatePerTonneKm,
    cargoTonnesPerTrip, totalCargoTonnesFleet, totalCargoTonneKmFleet,
    loopCostPerTonneTrip, loopCostPerTonneKm, segmentCostPerTonneKm, totalFreightRatePerTonneTrip, currentSOH,
    criticalSOHLimit, resolvedSOHReplacementLimit, batterySetsReplacedCount, batteryReplacementLog, sohTimeline, rangeTimeline,
    segmentOverloads, maxTheoreticalRange: baseTheoreticalRange, operationalRangeAtStart: baseOperationalRangeAtStart, operationalRangeAtSOHLimit, replacementsPerVehicle: batteryReplacementLog.length,
    totalUpfrontGSTPrice, loanUpfrontDownpayment, loanPrincipalDebt, loanAnnualEMI, loanMonthlyEMI: loanAnnualEMI / 12,
    capitalSetupInfra, infraCapexPerTruck, loadedCapexPerTruckOnRoad, loadedCapexPerTruckEquity, totalFleetUpfrontCapex, totalFleetOnRoadCapex,
    autoStationManpower, totalMonthlyStationManpower, avgDoDFraction, cyclesToEOL,
    annualCyclesPerVehicle
  };
}

function findOptimalChargingNetwork(v, routeSegments, cfg, chargingStationOverrides, dieselMatrix, evMatrix) {
  const n = routeSegments.length;
  if (v.type !== "electric" || n === 0 || n > 12) return null;

  let best = null;
  const totalCombos = 1 << n;
  for (let mask = 0; mask < totalCombos; mask++) {
    const candidateSegments = routeSegments.map((s, i) => ({ ...s, hasDepotAtTo: !!(mask & (1 << i)) }));
    const metrics = computeVehicleMetrics(v, candidateSegments, cfg, chargingStationOverrides, dieselMatrix, evMatrix);
    if (!best || metrics.npvTCOSum < best.npvTCOSum) {
      best = {
        npvTCOSum: metrics.npvTCOSum, depotFlags: candidateSegments.map((s) => s.hasDepotAtTo),
        uniqueStationsCount: metrics.uniqueStationsCount, totalChargersNeeded: metrics.totalChargersNeeded, chargingStopsCount: metrics.chargingStopsCount
      };
    }
  }
  return best;
}

function computeBreakeven(chartData, nameA, nameB) {
  if (!nameA || !nameB) return null;
  for (let i = 1; i < chartData.length; i++) {
    const prevDiff = chartData[i - 1][nameA] - chartData[i - 1][nameB];
    const currDiff = chartData[i][nameA] - chartData[i][nameB];
    if (prevDiff === 0) return chartData[i - 1].year;
    if ((prevDiff > 0) !== (currDiff > 0)) {
      const frac = prevDiff / (prevDiff - currDiff);
      return chartData[i - 1].year + frac;
    }
  }
  return null;
}

function buildMonthlyBatteryTimeline(v, years) {
  const months = Math.max(1, Math.round(years * 12));
  const annualCycles = Math.max(0, v.annualCyclesPerVehicle || 0);
  const monthlyCycles = annualCycles / 12;
  const cyclesToEOL = Math.max(1, v.cyclesToEOL || 1);
  const baseRange = Math.max(0, v.operationalRangeAtStart || 0);
  const kneeSOH = v.kneeSOH || 88;
  const kneeCycleFraction = v.kneeCycleFraction || 0.7;
  const eolSOH = v.resolvedSOHReplacementLimit || v.batterySOHThreshold || 75;
  const postKneeExponent = v.postKneeExponent || 1.6;

  let cyclesSinceReplacement = 0;
  const timeline = [];

  for (let month = 0; month <= months; month++) {
    if (month > 0) {
      cyclesSinceReplacement += monthlyCycles;
      while (cyclesSinceReplacement >= cyclesToEOL) cyclesSinceReplacement -= cyclesToEOL;
    }

    const soh = sohAtCycleFraction(
      cyclesSinceReplacement / cyclesToEOL,
      kneeSOH, kneeCycleFraction, eolSOH, postKneeExponent
    );

    timeline.push({
      month,
      year: month / 12,
      soh: Math.round(soh * 10) / 10,
      range: Math.round(baseRange * (soh / 100))
    });
  }
  return timeline;
}

// ---------------------------------------------------------------------------
// MAIN APPLICATION COMPONENT
// ---------------------------------------------------------------------------
export default function ComprehensiveTCOCalculator() {
  const [darkMode, setDarkMode] = useState(true);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('settings');
  const [activeResultTab, setActiveResultTab] = useState('kpi');
  
  // Matrices State
  const [dieselMatrix, setDieselMatrix] = useState(DEFAULT_DIESEL_EFFICIENCY_MATRIX);
  const [evMatrix, setEvMatrix] = useState(DEFAULT_EV_EFFICIENCY_MATRIX);
  const [matrixEditMode, setMatrixEditMode] = useState('diesel');

  const [workingDaysPerMonth, setWorkingDaysPerMonth] = useState(25);
  const [loadingUnloadingTimePerTrip, setLoadingUnloadingTimePerTrip] = useState(10);
  const [analysisPeriod, setAnalysisPeriod] = useState(8);
  
  // Discounting configuration
  const [enableDiscounting, setEnableDiscounting] = useState(false);
  const [discountRate, setDiscountRate] = useState(10);

  // Active Cost Escalations (% p.a.)
  const [escFuel, setEscFuel] = useState(1.0);
  const [escElectricity, setEscElectricity] = useState(2.0);
  const [escAMC, setEscAMC] = useState(0.0);
  const [escToll, setEscToll] = useState(0.0);
  const [escTyre, setEscTyre] = useState(2.0);
  const [escMisc, setEscMisc] = useState(2.0);
  const [escInsurance, setEscInsurance] = useState(1.0);
  const [escWages, setEscWages] = useState(5.0);
  const [escLandLease, setEscLandLease] = useState(7.0);

  const [routeSegments, setRouteSegments] = useState(DEFAULT_ROUTE.map((s, i) => ({
    ...s, monthlyTonnage: i === 1 ? 0 : 85000
  })));
  const [expandedSegmentId, setExpandedSegmentId] = useState(null);
  const [vehicles, setVehicles] = useState(INITIAL_VEHICLES);
  const [payloadModes, setPayloadModes] = useState({});
  const [chargingStationOverrides, setChargingStationOverrides] = useState(() => {
    try {
      const raw = localStorage.getItem("truck-tco-charging-overrides");
      return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
  });

  useEffect(() => {
    try {
      localStorage.setItem("truck-tco-charging-overrides", JSON.stringify(chargingStationOverrides));
    } catch (_) {}
  }, [chargingStationOverrides]);

  const [optimizerResults, setOptimizerResults] = useState({});
  const [optimizerRunning, setOptimizerRunning] = useState(null);
  const [payloadWarnings, setPayloadWarnings] = useState({});

  const updateMatrixValue = (type, road, traffic, payloadKey, val) => {
    if (type === 'diesel') {
      setDieselMatrix(prev => ({
        ...prev,
        [road]: { ...prev[road], [traffic]: { ...prev[road][traffic], [payloadKey]: val } }
      }));
    } else {
      setEvMatrix(prev => ({
        ...prev,
        [road]: { ...prev[road], [traffic]: { ...prev[road][traffic], [payloadKey]: val } }
      }));
    }
  };

  const resetMatrices = () => {
    setDieselMatrix(DEFAULT_DIESEL_EFFICIENCY_MATRIX);
    setEvMatrix(DEFAULT_EV_EFFICIENCY_MATRIX);
  };

  const handleAddVehicle = (type) => {
    const nextId = `v-custom-${Date.now()}`;
    const baseDefault = {
      id: nextId, name: `${type.toUpperCase()} Custom ${vehicles.length + 1}`, type: type,
      purchasePrice: type === "diesel" ? 4500000 : 10500000, gstRate: type === "diesel" ? 18 : 5,
      registrationFee: 0, trailerCost: 0, vehicleMiscCost: 0, tractorWeight: type === "diesel" ? 8500 : 11500,
      trailerWeight: 9000, gvwr: 55000, baseUnloadedEconomy: type === "diesel" ? 5.0 : 1.3,
      baseLoadedEconomy: type === "diesel" ? 3.2 : 0.75, maintCostPerKm: type === "diesel" ? 3.6 : 2.4,
      insuranceRatePct: 2.5, residualPct: type === "diesel" ? 12 : 10, allowOverloading: false, overloadPenaltyPctPerTonne: 2.0,
      financing: "emi", downPaymentPct: 15, interestRate: 9.5, loanTenure: 7, driverSalaryMonthly: 35000, driversPerVehicle: 1,
      tollCostPerTrip: 7350, tyresFront: 2, tyreCostFront: 21000, tyreLifeFront: 100000, tyresRear: 4, tyreCostRear: 22000, tyreLifeRear: 90000,
      tyresTrailer: 12, tyreCostTrailer: 22000, tyreLifeTrailer: 80000, scheduledDowntimeDays: 12, unscheduledDowntimeHrs: 120,
      miscCostPerMonth: 10000, miscCostNotes: "Chai/Paani", operatorMarginPerTruckMonthly: 25000, driverRestDelayFactorKm: 200,
    };

    if (type === "diesel") {
      baseDefault.fuelOrElectricPrice = 94; baseDefault.fuelCapacityLitres = 400;
      baseDefault.safeFuelThreshold = 15; baseDefault.refuelTimeMins = 20;
    } else {
      baseDefault.batteryCapacity = 500; baseDefault.batteryReplacementCost = 3800000;
      baseDefault.refCycleLifeAt100DoD = 1200; baseDefault.dodStressExponentK = 1.1;
      baseDefault.kneeSOH = 88; baseDefault.kneeCycleFraction = 0.7; baseDefault.postKneeExponent = 1.6;
      baseDefault.batterySOHThreshold = 75;
      baseDefault.safeSoCThreshold = 10; baseDefault.stationCost = 2500000;
      baseDefault.chargerCost = 1500000; baseDefault.defaultChargersPerStation = 1; baseDefault.infrastructureTaxCredit = 0;
      baseDefault.chargeSpeedKW = 150; baseDefault.chargingTimeMarginPct = 10; baseDefault.electricityRate = 8.5;
      baseDefault.depotLandLeaseMonthly = 0;
      baseDefault.costPerManpower = 25000; baseDefault.opsInchargeCount = 2; baseDefault.opsInchargeCost = 70000;
      baseDefault.supportingManpowerCount = 6; baseDefault.supportingManpowerCost = 40000;
      baseDefault.useDynamicSOHLimit = true;
    }

    setVehicles([...vehicles, baseDefault]);
    const newCap = getPayloadCap(baseDefault);
    const sameTypeSibling = vehicles.find((vv) => vv.type === type);
    setRouteSegments(routeSegments.map((seg) => {
      const siblingVal = sameTypeSibling ? getSegPayload(seg, sameTypeSibling.id) : null;
      const defaultVal = siblingVal !== null ? Math.min(siblingVal, newCap) : Math.round(newCap * 0.85 * 10) / 10;
      return { ...seg, payloadByVehicle: { ...seg.payloadByVehicle, [nextId]: defaultVal } };
    }));
  };

  const handleRemoveVehicle = (id) => {
    if (vehicles.length <= 1) return;
    setVehicles(vehicles.filter((v) => v.id !== id));
    setRouteSegments(routeSegments.map((seg) => {
      const { [id]: _removed, ...rest } = seg.payloadByVehicle || {};
      return { ...seg, payloadByVehicle: rest };
    }));
    setOptimizerResults((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    setChargingStationOverrides((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const updateVehicleProp = (id, prop, val) => {
    setVehicles(vehicles.map((v) => (v.id === id ? { ...v, [prop]: val } : v)));
  };

  const handleAddSegment = () => {
    const nextChar = String.fromCharCode(65 + routeSegments.length);
    const nextCharTo = String.fromCharCode(66 + routeSegments.length);
    const payloadByVehicle = {};
    vehicles.forEach((v) => { payloadByVehicle[v.id] = Math.round(getPayloadCap(v) * 0.85 * 10) / 10; });
    const newSeg = {
      id: `s-${Date.now()}`, from: `Point ${nextChar}`, to: `Point ${nextCharTo}`, distance: 120,
      avgSpeed: 55, stretches: generateDefaultStretches(), hasDepotAtTo: false, monthlyTonnage: 0, payloadByVehicle
    };
    setRouteSegments([...routeSegments, newSeg]);
  };

  const handleRemoveSegment = (id) => {
    if (routeSegments.length <= 1) return;
    setRouteSegments(routeSegments.filter((s) => s.id !== id));
  };

  const updateSegmentProp = (segId, prop, val) => setRouteSegments(routeSegments.map((s) => (s.id === segId ? { ...s, [prop]: val } : s)));

  const updateSegmentVehiclePayload = (segId, vehicleId, rawVal, cap, allowOverload) => {
    const clamped = allowOverload ? Math.max(0, rawVal) : Math.max(0, Math.min(rawVal, cap));
    setRouteSegments(routeSegments.map((s) => (s.id === segId ? { ...s, payloadByVehicle: { ...s.payloadByVehicle, [vehicleId]: clamped } } : s)));
    const warnKey = `${segId}_${vehicleId}`;
    if (rawVal > cap && !allowOverload) {
      setPayloadWarnings((prev) => ({ ...prev, [warnKey]: true }));
      setTimeout(() => setPayloadWarnings((prev) => {
        const { [warnKey]: _removed, ...rest } = prev;
        return rest;
      }), 3000);
    }
  };

  const updateStretchPercentage = (segId, roadType, traffic, val) => {
    setRouteSegments(
      routeSegments.map((seg) => {
        if (seg.id !== segId) return seg;
        const updated = seg.stretches.map((st) => {
          if (st.roadType === roadType && st.traffic === traffic) return { ...st, percentage: val };
          return st;
        });
        return { ...seg, stretches: updated };
      })
    );
  };

  const updateChargingStationOverride = (vehicleId, stopKey, prop, value) => {
    setChargingStationOverrides((prev) => ({
      ...prev, [vehicleId]: { ...(prev[vehicleId] || {}), [stopKey]: { ...(prev[vehicleId]?.[stopKey] || {}), [prop]: value } }
    }));
  };

  const resetChargingStationOverride = (vehicleId, stopKey) => {
    setChargingStationOverrides((prev) => {
      const vehicleOverrides = { ...(prev[vehicleId] || {}) };
      delete vehicleOverrides[stopKey];
      if (Object.keys(vehicleOverrides).length === 0) {
        const { [vehicleId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [vehicleId]: vehicleOverrides };
    });
  };

  const results = useMemo(() => {
    const years = Math.max(1, Math.round(analysisPeriod));
    const effectiveDiscountRate = enableDiscounting ? (discountRate / 100) : 0;
    const cfg = {
      years, dfRate: effectiveDiscountRate,
      escF: escFuel / 100, escE: escElectricity / 100, escAMC: escAMC / 100, escToll: escToll / 100,
      escTyre: escTyre / 100, escMisc: escMisc / 100, escIns: escInsurance / 100, escW: escWages / 100,
      escLand: escLandLease / 100, workingDaysPerMonth, loadingUnloadingTimePerTrip
    };

    const computedVehicles = vehicles.map((v) => computeVehicleMetrics(v, routeSegments, cfg, chargingStationOverrides, dieselMatrix, evMatrix));

    const chartData = [{ year: 0 }];
    computedVehicles.forEach((v) => { chartData[0][v.name] = v.cumCostTimeline[0]; });

    for (let t = 1; t <= years; t++) {
      const row = { year: t };
      computedVehicles.forEach((v) => { row[v.name] = v.cumCostTimeline[t]; });
      chartData.push(row);
    }

    const firstDiesel = computedVehicles.find((v) => v.type === "diesel");
    const firstElectric = computedVehicles.find((v) => v.type === "electric");
    const breakevenYear = (firstDiesel && firstElectric) ? computeBreakeven(chartData, firstDiesel.name, firstElectric.name) : null;

    const radarDims = [
      { key: "npvTCOSum", label: "Lower TCO", inverse: true },
      { key: "costPerTonneKm", label: "Lower ₹/Tonne-km", inverse: true },
      { key: "utilizationPctComputed", label: "Utilization", inverse: false, cap: 100 },
      { key: "turnaroundCycleHrs", label: "Faster Turnaround", inverse: true },
      { key: "fleetSizeRequired", label: "Smaller Fleet", inverse: true },
    ];
    const radarData = computedVehicles.length > 0 ? radarDims.map((dim) => {
      const row = { metric: dim.label };
      if (dim.inverse) {
        const best = Math.min(...computedVehicles.map((v) => Math.max(0.0001, v[dim.key])));
        computedVehicles.forEach((v) => { row[v.name] = Math.round((best / Math.max(0.0001, v[dim.key])) * 100); });
      } else {
        computedVehicles.forEach((v) => { row[v.name] = Math.round(Math.min(dim.cap || 100, v[dim.key])); });
      }
      return row;
    }) : [];

    const segmentFreightData = routeSegments.map((seg, idx) => {
      const row = { name: `${seg.from} → ${seg.to}` };
      computedVehicles.forEach(v => {
        row[v.name] = Math.round(v.segmentCostPerTonneKm[idx]?.freightRatePerTonneSeg || 0);
      });
      return row;
    });

    const timeUtilizationData = computedVehicles.map(v => {
      const total = v.turnaroundCycleHrs;
      return {
        name: v.name, "Driving": (v.drivingHrs / total) * 100, "Load/Unload": (v.loadUnloadHrs / total) * 100,
        "Refuel / Charge": ((v.chargingDowntimeHrs + (v.refuelingDowntimeHrs || 0)) / total) * 100, "Rest/Queue": (v.generalRestDowntimeHrs / total) * 100,
      };
    });

    const rangeLifecycleData = computedVehicles.filter(v => v.type === "electric").map(v => ({
      name: v.name, "Start of Life (100% SOH)": Math.round(v.operationalRangeAtStart), "End of Life (SOH Limit)": Math.round(v.operationalRangeAtSOHLimit)
    }));

    const evVehicles = computedVehicles.filter(v => v.type === "electric");
    const multiEvSohData = [];
    const multiEvRangeData = [];

    const monthlyBatteryTimelines = evVehicles.map(v => ({
      vehicle: v,
      timeline: buildMonthlyBatteryTimeline(v, years)
    }));

    for (let month = 0; month <= years * 12; month++) {
      const sohRow = { month };
      const rangeRow = { month };

      monthlyBatteryTimelines.forEach(({ vehicle, timeline }) => {
        const item = timeline[month];
        sohRow[vehicle.name] = item ? item.soh : 100;
        rangeRow[vehicle.name] = item ? item.range : Math.round(vehicle.operationalRangeAtStart);
      });

      multiEvSohData.push(sohRow);
      multiEvRangeData.push(rangeRow);
    }

    return { years, computedVehicles, chartData, cfg, firstDiesel, firstElectric, breakevenYear, radarData, segmentFreightData, timeUtilizationData, rangeLifecycleData, multiEvSohData, multiEvRangeData, evVehicles };
  }, [ vehicles, routeSegments, chargingStationOverrides, workingDaysPerMonth, loadingUnloadingTimePerTrip, analysisPeriod, enableDiscounting, discountRate, escFuel, escElectricity, escAMC, escToll, escTyre, escMisc, escInsurance, escWages, escLandLease, dieselMatrix, evMatrix ]);

  const handleRunOptimizer = (vehicleId) => {
    const v = vehicles.find((vv) => vv.id === vehicleId);
    if (!v) return;
    setOptimizerRunning(vehicleId);
    const best = findOptimalChargingNetwork(v, routeSegments, results.cfg, chargingStationOverrides, dieselMatrix, evMatrix);
    setOptimizerResults((prev) => ({ ...prev, [vehicleId]: best }));
    setOptimizerRunning(null);
  };

  const handleApplyOptimalNetwork = (vehicleId) => {
    const best = optimizerResults[vehicleId];
    if (!best || best.depotFlags.length !== routeSegments.length) return; 
    setRouteSegments(routeSegments.map((s, i) => ({ ...s, hasDepotAtTo: best.depotFlags[i] })));
  };

  const renderCustomBarLabel = (props) => {
    const { x, y, width, payload, dataKey } = props;
    const baselineKey = results.computedVehicles[0]?.name;
    if (!payload || !baselineKey || dataKey === baselineKey) return null;
    const baseValue = payload[baselineKey];
    const currentValue = payload[dataKey];
    if (!baseValue || !currentValue) return null;
    const diff = (currentValue - baseValue) / baseValue;
    if (Math.abs(diff) < 0.01) return null;
    const isUp = diff > 0;
    const color = isUp ? "var(--bad)" : "var(--good)";
    return (
      <text x={x + width / 2} y={y - 6} fill={color} fontSize="11" textAnchor="middle" fontWeight="bold">
        {isUp ? "↑" : "↓"} {Math.abs(diff * 100).toFixed(0)}%
      </text>
    );
  };

  const TABS = [
    { id: 'settings', label: '1. General Settings', icon: <Settings size={16} /> },
    { id: 'vehicles', label: '2. Vehicle Profiles', icon: <Truck size={16} /> },
    { id: 'route', label: '3. Route Planner', icon: <MapPin size={16} /> },
    { id: 'matrices', label: '4. Efficiency Matrices', icon: <Activity size={16} /> },
    { id: 'results', label: '5. Analytics Dashboard', icon: <TrendingUp size={16} /> }
  ];

  const RESULT_TABS = [
    { id: 'kpi', label: 'Summary & KPIs', icon: <Target size={14} /> },
    { id: 'segment', label: 'Unit Economics', icon: <Route size={14} /> },
    { id: 'timeline', label: 'Timeline & Breakdown', icon: <BarChart3 size={14} /> },
    { id: 'battery', label: 'EV Infrastructure & Sizing', icon: <Zap size={14} /> }
  ];

  return (
    <div className={`wrap ${darkMode ? "dark-theme" : "light-theme"}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .wrap {
          --cyber-cyan: #00f2fe;
          --cyber-mint: #00e5a3;
          --cyber-blue: #38bdf8;
          --cyber-purple: #818cf8;
          --cyber-amber: #f59e0b;
          --cyber-rose: #f43f5e;
          --shadow-glow: 0 0 20px rgba(0, 229, 163, 0.15);
          --shadow-cyan-glow: 0 0 20px rgba(0, 242, 254, 0.2);

          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          width: 100%; max-width: 1440px; min-height: 100vh; margin: 0 auto; padding: 24px;
          border-radius: 16px; box-sizing: border-box; text-align: left; overflow-x: hidden;
          transition: background-color 0.2s ease, color 0.2s ease; -webkit-font-smoothing: antialiased;
        }

        .wrap.dark-theme {
          --bg: #07090e;
          --panel: #0d121d;
          --panel-alt: #131a29;
          --panel-hover: #182235;
          --border: #1e293b;
          --border-bright: #334155;
          --text: #f8fafc;
          --text-dim: #8b9bb4;
          --bev: #00e5a3;
          --diesel: #f59e0b;
          --good: #00e5a3;
          --bad: #f43f5e;
          --input-bg: #090d15;
          background: var(--bg); color: var(--text);
        }

        .wrap.light-theme {
          --bg: #f8fafc;
          --panel: #ffffff;
          --panel-alt: #f1f5f9;
          --panel-hover: #e2e8f0;
          --border: #cbd5e1;
          --border-bright: #94a3b8;
          --text: #0f172a;
          --text-dim: #64748b;
          --bev: #0d9488;
          --diesel: #d97706;
          --good: #059669;
          --bad: #e11d48;
          --input-bg: #f8fafc;
          background: var(--bg); color: var(--text);
        }

        .num { font-family: 'JetBrains Mono', monospace; letter-spacing: -0.02em; }
        
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid var(--border); padding-bottom: 18px; flex-wrap: wrap; gap: 16px; }
        .header-title { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; display: flex; align-items: center; gap: 10px; background: linear-gradient(135deg, var(--text) 0%, var(--cyber-mint) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        
        .tabs { display: flex; gap: 6px; margin-bottom: 24px; border-bottom: 1px solid var(--border); padding-bottom: 0; overflow-x: auto; scrollbar-width: none; }
        .tabs::-webkit-scrollbar { display: none; }
        .tab { display: flex; align-items: center; gap: 8px; background: transparent; border: 1px solid transparent; border-bottom: none; padding: 12px 18px; color: var(--text-dim); cursor: pointer; font-size: 13.5px; font-weight: 600; border-radius: 10px 10px 0 0; transition: all 0.2s ease; white-space: nowrap; margin-bottom: -1px; }
        .tab:hover { color: var(--text); background: var(--panel-alt); }
        .tab.active { background: var(--panel); color: var(--bev); border-color: var(--border); border-bottom-color: var(--panel); box-shadow: 0 -2px 0 var(--bev) inset; }
        
        .sub-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
        .sub-tab { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border); background: var(--panel-alt); color: var(--text-dim); cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s ease; }
        .sub-tab:hover { border-color: var(--bev); color: var(--text); }
        .sub-tab.active { background: linear-gradient(135deg, var(--cyber-cyan) 0%, var(--cyber-mint) 100%); color: #07090e; border-color: transparent; font-weight: 700; box-shadow: var(--shadow-glow); }
        
        .theme-btn, .reset-btn, .add-btn { display: flex; align-items: center; gap: 6px; background: var(--panel); border: 1px solid var(--border); color: var(--text); padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.15s ease; }
        .theme-btn:hover, .reset-btn:hover, .add-btn:hover { border-color: var(--bev); background: var(--panel-alt); }
        
        .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 24px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25); margin-bottom: 24px; animation: fadeIn 0.25s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .panel h2 { font-size: 17px; font-weight: 700; margin: 0 0 20px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border); padding-bottom: 12px; letter-spacing: -0.01em; }
        
        .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .grid-auto-fit { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; }
        @media(max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }
        
        .field { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .field-label { font-size: 12.5px; color: var(--text-dim); flex: 1; }
        .field-input { display: flex; align-items: center; background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; transition: border-color 0.15s ease; }
        .field-input:focus-within { border-color: var(--bev); box-shadow: 0 0 0 2px rgba(0, 229, 163, 0.15); }
        .field-input input { width: 105px; background: transparent; border: none; color: var(--text); padding: 8px 10px; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; text-align: right; }
        .field-input input:focus { outline: none; }
        .field-suffix { font-size: 11px; color: var(--text-dim); padding-right: 10px; font-weight: 600; }
        
        .compact-input { background: var(--input-bg); border: 1px solid var(--border); color: var(--text); padding: 6px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px; text-align: right; width: 100%; }
        .compact-input:focus { border-color: var(--bev); outline: none; }
        
        .route-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12.5px; }
        .route-table th { background: var(--panel-alt); padding: 12px; color: var(--text-dim); border-bottom: 2px solid var(--border); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
        .route-table td { padding: 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .route-table input, .route-table select { background: var(--input-bg); border: 1px solid var(--border); color: var(--text); padding: 8px; border-radius: 6px; font-size: 12.5px; }
        .route-table input[type="text"] { width: 100%; }
        .route-table input[type="number"] { width: 85px; text-align: right; }
        
        .expand-btn { background: var(--panel-alt); border: 1px solid var(--border); color: var(--bev); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11.5px; font-weight: 600; transition: 0.15s; }
        .expand-btn:hover { background: rgba(0, 229, 163, 0.1); border-color: var(--bev); }
        .stretch-drawer { background: var(--panel-alt); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-top: 8px; }
        .stretch-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-top: 12px; }
        @media(max-width: 1024px) { .stretch-grid { grid-template-columns: repeat(2, 1fr); } }
        .stretch-card { background: var(--panel); border: 1px solid var(--border); padding: 12px; border-radius: 8px; }
        
        .vehicle-deck { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 20px; margin-top: 16px; }
        .vehicle-card { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
        .vehicle-card.active-electric { border-top: 3px solid var(--bev); }
        .vehicle-card.active-diesel { border-top: 3px solid var(--diesel); }
        .vcard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
        .vcard-title { font-size: 16px; font-weight: 700; }
        
        .seg { display: flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--input-bg); }
        .seg button { flex: 1; background: transparent; color: var(--text-dim); border: none; padding: 8px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .seg button.active { background: linear-gradient(135deg, var(--cyber-cyan) 0%, var(--cyber-mint) 100%); color: #07090e; }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .kpi-card { background: var(--panel-alt); border: 1px solid var(--border); border-radius: 12px; padding: 18px; position: relative; overflow: hidden; }
        .kpi-label { font-size: 11px; color: var(--text-dim); text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; letter-spacing: 0.05em; font-weight: 700; }
        .kpi-val { font-size: 26px; font-weight: 800; margin-bottom: 6px; letter-spacing: -0.03em; }
        .kpi-sub { font-size: 11.5px; color: var(--text-dim); margin-top: 6px; line-height: 1.5; }
        
        .alert-strip { background: rgba(244, 63, 94, 0.08); border: 1px solid var(--bad); color: var(--text); border-radius: 10px; padding: 14px; font-size: 13px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px; }
        .breakeven-strip { background: linear-gradient(90deg, rgba(0, 229, 163, 0.1) 0%, rgba(0, 242, 254, 0.05) 100%); border: 1px solid var(--bev); border-radius: 10px; padding: 16px 18px; font-size: 13.5px; margin-bottom: 24px; display: flex; align-items: center; gap: 14px; }
        .section-tag { font-size: 11px; font-weight: 800; color: var(--bev); text-transform: uppercase; letter-spacing: 0.08em; margin: 20px 0 10px; border-bottom: 1px solid var(--border); padding-bottom: 4px; }
        
        .cyber-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 6px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .badge-good { background: rgba(0, 229, 163, 0.12); color: var(--good); border: 1px solid rgba(0, 229, 163, 0.3); }
        .badge-warn { background: rgba(245, 158, 11, 0.12); color: var(--diesel); border: 1px solid rgba(245, 158, 11, 0.3); }
        .badge-info { background: rgba(0, 242, 254, 0.12); color: var(--cyber-cyan); border: 1px solid rgba(0, 242, 254, 0.3); }
        .badge-muted { background: rgba(148, 163, 184, 0.12); color: var(--text-dim); border: 1px solid var(--border); }
        
        .optimizer-box { background: var(--panel-alt); border: 1px dashed var(--bev); border-radius: 10px; padding: 14px; margin-top: 12px; }
        .optimizer-result { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-top: 10px; font-size: 12px; }
        .mini-btn { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, var(--cyber-cyan) 0%, var(--cyber-mint) 100%); color: #07090e; border: none; padding: 7px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 700; }
        .mini-btn-outline { display: inline-flex; align-items: center; gap: 6px; background: transparent; color: var(--text); border: 1px solid var(--border); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11.5px; font-weight: 600; }
        .mini-btn-outline:hover { border-color: var(--bev); color: var(--bev); }
        
        .seg-cost-table, .time-split-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .seg-cost-table th, .time-split-table th { text-align: right; padding: 10px; color: var(--text-dim); font-size: 11px; font-weight: 700; text-transform: uppercase; border-bottom: 2px solid var(--border); }
        .seg-cost-table th:first-child, .time-split-table th:first-child { text-align: left; }
        .seg-cost-table td, .time-split-table td { text-align: right; padding: 10px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .seg-cost-table td:first-child, .time-split-table td:first-child { text-align: left; }

        .donut-card { background: var(--panel-alt); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; align-items: center; }
        .donut-legend { display: flex; flex-wrap: wrap; gap: 8px 14px; justify-content: center; margin-top: 14px; }
        .donut-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-dim); }
        .donut-legend-color { width: 8px; height: 8px; border-radius: 50%; }

        /* ========================================================================= */
        /* DIGITAL TWIN FLOW CANVAS & AUTO-WRAPPING PIPELINE STYLES                 */
        /* ========================================================================= */
        .flow-canvas-viewport {
          width: 100%; height: 560px; overflow: hidden;
          background: #07090e;
          border: 1px solid var(--border); border-radius: 14px;
          position: relative; box-shadow: inset 0 0 40px rgba(0,0,0,0.5);
        }
        .flow-canvas-viewport:fullscreen { width: 100vw; height: 100vh; border-radius: 0; }

        .flow-canvas-toolbar {
          position: absolute; top: 12px; left: 12px; right: 12px; z-index: 30;
          display: flex; justify-content: space-between; align-items: center; gap: 12px;
          pointer-events: none;
        }
        .flow-canvas-help, .flow-canvas-controls {
          pointer-events: auto; background: rgba(13, 18, 29, 0.85); backdrop-filter: blur(12px);
          border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          padding: 8px 12px;
        }
        .flow-canvas-help { display: flex; gap: 8px; align-items: center; font-size: 11.5px; color: var(--text-dim); }
        .flow-canvas-controls { display: flex; align-items: center; gap: 6px; }
        .flow-mode-toggle { display: flex; align-items: center; border: 1px solid var(--border); border-radius: 7px; overflow: hidden; margin-right: 4px; }
        .flow-mode-toggle button { display: inline-flex; align-items: center; gap: 5px; border: 0; background: transparent; color: var(--text-dim); padding: 6px 10px; font-size: 11px; font-weight: 700; cursor: pointer; }
        .flow-mode-toggle button.active { background: linear-gradient(135deg, var(--cyber-cyan) 0%, var(--cyber-mint) 100%); color: #07090e; font-weight: 800; }
        .flow-zoom-label { min-width: 44px; text-align: center; font: 700 11px 'JetBrains Mono', monospace; color: var(--text-dim); }

        .status-dot-pulse {
          width: 8px; height: 8px; border-radius: 50%; background: var(--cyber-mint);
          box-shadow: 0 0 10px var(--cyber-mint);
          animation: pulseGlow 2s infinite ease-in-out;
        }
        @keyframes pulseGlow { 0%, 100% { transform: scale(0.9); opacity: 0.7; } 50% { transform: scale(1.2); opacity: 1; } }

        /* Interactive Canvas Drag Surface */
        .interactive-canvas-surface {
          width: 100%; height: 100%; cursor: grab; position: relative; user-select: none;
          background-image: radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .interactive-canvas-surface.is-panning { cursor: grabbing; }
        .interactive-transform-layer { position: absolute; top: 0; left: 0; transform-origin: 0 0; }

        .canvas-node-card {
          position: absolute; background: rgba(13, 18, 29, 0.95); backdrop-filter: blur(12px);
          border: 1px solid var(--border); border-radius: 12px; padding: 14px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); cursor: grab; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .canvas-node-card:active { cursor: grabbing; }
        .canvas-node-card.station { border-top: 3px solid var(--bev); }
        .canvas-node-card.start { border-top: 3px solid var(--good); }
        .canvas-node-card.waypoint { border-top: 3px solid var(--text-dim); }
        .canvas-node-card.is-dragging { box-shadow: 0 12px 36px rgba(0,0,0,0.8), var(--shadow-cyan-glow); border-color: var(--cyber-cyan); }
        .canvas-node-card.merge-drop-hover { outline: 2px solid var(--cyber-mint); box-shadow: 0 0 30px rgba(0, 229, 163, 0.5); transform: scale(1.02); }

        .card-top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .node-title { font-size: 13px; font-weight: 700; color: var(--text); line-height: 1.3; }
        .node-sub { font-size: 10.5px; color: var(--text-dim); margin-top: 4px; }

        .cyber-input {
          width: 100%; background: var(--input-bg); border: 1px solid var(--border);
          border-radius: 6px; color: var(--text); padding: 5px 8px; font-size: 11.5px; font-weight: 700;
        }
        .cyber-input:focus { border-color: var(--bev); outline: none; }
        .cyber-input-mini {
          width: 55px; background: var(--input-bg); border: 1px solid var(--border);
          border-radius: 6px; color: var(--text); padding: 4px 6px; font-size: 11px; font-family: 'JetBrains Mono', monospace; text-align: right;
        }
        .cyber-input-mini:focus { border-color: var(--bev); outline: none; }

        .station-meta-row {
          display: flex; justify-content: space-between; align-items: center; gap: 8px;
          padding: 6px 0; border-bottom: 1px dashed var(--border);
        }

        /* Seamless Merged Group Container */
        .merged-group-box {
          background: rgba(0, 229, 163, 0.04); border: 1px solid rgba(0, 229, 163, 0.2);
          border-radius: 8px; padding: 8px; margin-top: 10px;
        }
        .merged-group-title {
          font-size: 10.5px; font-weight: 700; color: var(--cyber-mint); display: flex;
          align-items: center; gap: 5px; margin-bottom: 6px;
        }
        .merged-child-row {
          display: flex; justify-content: space-between; align-items: center; gap: 8px;
          background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px;
          padding: 5px 8px; margin-bottom: 4px;
        }
        .merged-child-row:last-child { margin-bottom: 0; }
        .cyber-unlink-btn {
          background: transparent; border: 1px solid var(--border); border-radius: 4px;
          color: var(--text-dim); padding: 3px 6px; font-size: 10px; cursor: pointer; display: flex; align-items: center; gap: 3px;
        }
        .cyber-unlink-btn:hover { border-color: var(--bad); color: var(--bad); }

        /* Standard Auto-wrapping Pipeline Layout */
        .standard-pipeline-viewport {
          width: 100%; height: 100%; overflow-y: auto; padding: 65px 24px 30px; box-sizing: border-box;
        }
        .standard-pipeline-wrap {
          display: flex; flex-wrap: wrap; align-items: flex-start; gap: 14px; width: 100%;
        }
        .standard-pipeline-wrap::-webkit-scrollbar { width: 8px; }
        .standard-pipeline-wrap::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        .pipeline-card {
          flex: 0 1 290px; min-width: 260px; max-width: 320px;
          background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
          padding: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.3); transition: transform 0.15s ease;
        }
        .pipeline-card.station { border-top: 3px solid var(--bev); }
        .pipeline-card.start { border-top: 3px solid var(--good); }
        .pipeline-card.waypoint { border-top: 3px solid var(--text-dim); }

        .pipeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .pipeline-title { font-size: 13px; font-weight: 700; color: var(--text); }
        .pipeline-footer-stat { font-size: 11px; color: var(--text-dim); margin-top: 6px; }

        .pipeline-connector-pill {
          display: flex; align-items: center; justify-content: center; padding: 0 2px;
          align-self: center; position: relative;
        }
        .pipeline-line {
          width: 22px; height: 2px; background: linear-gradient(90deg, var(--bev), var(--cyber-cyan)); opacity: 0.6;
        }
        .pipeline-distance-chip {
          position: absolute; top: -14px; background: #07090e; border: 1px solid var(--border);
          border-radius: 10px; padding: 2px 6px; font-size: 9px; font-family: 'JetBrains Mono', monospace;
          color: var(--text-dim); white-space: nowrap;
        }
      `}</style>

      {/* Header controls */}
      <div className="header">
        <div>
          <div className="header-title">
            <Activity size={24} style={{ color: "var(--cyber-mint)" }} />
            Commercial Fleet Logistics & Duty Cycle TCO Simulator
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "4px" }}>
            High-precision DCF Lifecycle Costing & EV Infrastructure Digital Twin Engine
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="theme-btn" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            {darkMode ? "Light" : "Dark"}
          </button>
          <button className="reset-btn" onClick={() => {
            setRouteSegments(DEFAULT_ROUTE.map((s, i) => ({ ...s, monthlyTonnage: i === 1 ? 0 : 85000 })));
            setVehicles(INITIAL_VEHICLES);
            setOptimizerResults({});
            setChargingStationOverrides({});
            resetMatrices();
          }}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="tabs">
        {TABS.map(tab => (
          <button 
            key={tab.id} 
            className={`tab ${activeTab === tab.id ? 'active' : ''}`} 
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Payload Violation Warning Strip */}
      {results.computedVehicles.some(v => v.segmentOverloads.length > 0) && (
        <div className="alert-strip">
          <AlertTriangle size={20} style={{ flexShrink: 0, color: "var(--bad)" }} />
          <div>
            <strong style={{ display: "block", marginBottom: "4px", fontSize: "13.5px" }}>Payload Sizing Violations Detected!</strong>
            The cargo payload configured for some route segments exceeds the maximum carrying capacity of your vehicles.
            <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
              {results.computedVehicles.map(v => {
                if (v.segmentOverloads.length === 0) return null;
                return (
                  <div key={v.id} style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>
                    · <strong>{v.name}</strong> payload capacity is capped at <strong>{v.payloadCap.toFixed(1)}T</strong>. 
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Settings */}
      {activeTab === 'settings' && (
        <div className="panel">
          <h2><Settings size={18} color="var(--bev)" /> 1. General Settings</h2>
          <div className="grid-2">
            <div>
              <div className="section-tag" style={{ marginTop: 0 }}>Logistics & Timeline</div>
              <Field label="Operational Working Days" value={workingDaysPerMonth} onChange={setWorkingDaysPerMonth} suffix="Days/Month" step={1} />
              <Field label="Turnaround Load/Unload Time" value={loadingUnloadingTimePerTrip} onChange={setLoadingUnloadingTimePerTrip} suffix="Hours/Trip" step={0.5} />
              <Field label="Analysis Window" value={analysisPeriod} onChange={setAnalysisPeriod} suffix="Years" step={1} />
              
              <div className="field" style={{ marginTop: 14 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span className="field-label" style={{ fontWeight: 600 }}>Discount Rate / DCF Analysis</span>
                  <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                    {enableDiscounting ? "Active: Cash flows discounted to present value" : "Disabled: Nominal / undiscounted cash flows"}
                  </span>
                </div>
                <button
                  onClick={() => setEnableDiscounting(!enableDiscounting)}
                  className="mini-btn-outline"
                  style={{ borderColor: enableDiscounting ? "var(--bev)" : "var(--border)", color: enableDiscounting ? "var(--bev)" : "var(--text-dim)" }}
                >
                  {enableDiscounting ? <ToggleRight size={18} color="var(--bev)" /> : <ToggleLeft size={18} />}
                  {enableDiscounting ? "Enabled" : "Off"}
                </button>
              </div>

              {enableDiscounting && (
                <Field label="Discount Rate (WACC)" value={discountRate} onChange={setDiscountRate} suffix="%" step={0.5} />
              )}
            </div>
            <div>
              <div className="section-tag" style={{ marginTop: 0 }}>Cost Escalations (% per annum)</div>
              <Field label="Tariff (Diesel Fuel Price)" value={escFuel} onChange={setEscFuel} suffix="%" step={0.5} />
              <Field label="Energy Cost (Electricity Tariff)" value={escElectricity} onChange={setEscElectricity} suffix="%" step={0.5} />
              <Field label="AMC Escalation (Maintenance)" value={escAMC} onChange={setEscAMC} suffix="%" step={0.5} />
              <Field label="Toll" value={escToll} onChange={setEscToll} suffix="%" step={0.5} />
              <Field label="Tyre" value={escTyre} onChange={setEscTyre} suffix="%" step={0.5} />
              <Field label="Misc. & Overheads" value={escMisc} onChange={setEscMisc} suffix="%" step={0.5} />
              <Field label="Insurance" value={escInsurance} onChange={setEscInsurance} suffix="%" step={0.5} />
              <Field label="Driver & Manpower Salary" value={escWages} onChange={setEscWages} suffix="%" step={0.5} />
              <Field label="Land Lease Rental" value={escLandLease} onChange={setEscLandLease} suffix="%" step={0.5} />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Vehicles */}
      {activeTab === 'vehicles' && (
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, borderBottom: 'none' }}><Truck size={20} color="var(--bev)" /> 2. Fleet Vehicle Profiles</h2>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="theme-btn" style={{ borderColor: "var(--diesel)", background: "rgba(245, 158, 11, 0.05)" }} onClick={() => handleAddVehicle("diesel")}>
                <Plus size={14} /> Add Diesel
              </button>
              <button className="theme-btn" style={{ borderColor: "var(--bev)", background: "rgba(0, 229, 163, 0.05)" }} onClick={() => handleAddVehicle("electric")}>
                <Plus size={14} /> Add EV
              </button>
            </div>
          </div>

          <div className="vehicle-deck">
            {vehicles.map((v) => {
              const optResult = optimizerResults[v.id];
              const currentComputed = results.computedVehicles.find((cv) => cv.id === v.id);
              return (
              <div key={v.id} className={`vehicle-card ${v.type === "electric" ? "active-electric" : "active-diesel"}`}>
                <div className="vcard-header">
                  <div>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "800", color: v.type === "electric" ? "var(--bev)" : "var(--diesel)" }}>
                      {v.type.toUpperCase()} Specifications
                    </span>
                    <input
                      type="text" value={v.name} className="vcard-title num"
                      onChange={(e) => updateVehicleProp(v.id, "name", e.target.value)}
                      style={{ background: "transparent", border: "none", color: "var(--text)", borderBottom: "1px dashed var(--border)", width: "220px", display: "block", marginTop: "4px" }}
                    />
                  </div>
                  <button className="remove-btn" onClick={() => handleRemoveVehicle(v.id)} disabled={vehicles.length <= 1} style={{ background: "transparent", border: "none", color: "var(--bad)", cursor: "pointer" }}><Trash2 size={16} /></button>
                </div>

                <div className="section-tag" style={{ marginTop: 0 }}>Base Unit Economics</div>
                <Field label="Ex-Showroom Price (Ex GST)" value={v.purchasePrice} onChange={(val) => updateVehicleProp(v.id, "purchasePrice", val)} suffix="₹" step={50000} />
                <Field label="GST Rate" value={v.gstRate} onChange={(val) => updateVehicleProp(v.id, "gstRate", val)} suffix="%" step={1} />
                <Field label="Registration Fee (per vehicle)" value={v.registrationFee} onChange={(val) => updateVehicleProp(v.id, "registrationFee", val)} suffix="₹" step={5000} />
                <Field label="Trailer Cost (per vehicle)" value={v.trailerCost} onChange={(val) => updateVehicleProp(v.id, "trailerCost", val)} suffix="₹" step={50000} />
                <Field label="Misc. Vehicle Cost (one-time)" value={v.vehicleMiscCost} onChange={(val) => updateVehicleProp(v.id, "vehicleMiscCost", val)} suffix="₹" step={5000} />
                <Field label="Tractor Weight" value={v.tractorWeight} onChange={(val) => updateVehicleProp(v.id, "tractorWeight", val)} suffix="kg" step={100} />
                <Field label="Trailer Weight" value={v.trailerWeight} onChange={(val) => updateVehicleProp(v.id, "trailerWeight", val)} suffix="kg" step={100} />
                <Field label="GVWR Limit" value={v.gvwr} onChange={(val) => updateVehicleProp(v.id, "gvwr", val)} suffix="kg" step={500} />

                <div className="section-tag">Cargo & Overloading Constraints</div>
                <div className="field">
                  <span className="field-label" style={{ fontWeight: 600 }}>Allow Overloading (Exceed Payload Cap)</span>
                  <input type="checkbox" checked={!!v.allowOverloading} onChange={(e) => updateVehicleProp(v.id, "allowOverloading", e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "var(--bev)", cursor: "pointer" }} />
                </div>
                {v.allowOverloading && (
                  <Field label="Efficiency Penalty Per Overloaded Tonne" value={v.overloadPenaltyPctPerTonne} onChange={(val) => updateVehicleProp(v.id, "overloadPenaltyPctPerTonne", val)} suffix="%" step={0.5} />
                )}

                <div className="section-tag">Efficiency Parameters</div>
                <Field label="Unloaded Base Economy" value={v.baseUnloadedEconomy} onChange={(val) => updateVehicleProp(v.id, "baseUnloadedEconomy", val)} suffix={v.type === "diesel" ? "km/l" : "km/kWh"} step={0.1} />
                <Field label="Loaded Base Economy (at Max Payload)" value={v.baseLoadedEconomy} onChange={(val) => updateVehicleProp(v.id, "baseLoadedEconomy", val)} suffix={v.type === "diesel" ? "km/l" : "km/kWh"} step={0.1} />
                {v.type === "diesel" && (
                  <Field label="Diesel Retail Price" value={v.fuelOrElectricPrice} onChange={(val) => updateVehicleProp(v.id, "fuelOrElectricPrice", val)} suffix="₹/l" step={0.5} />
                )}

                {v.type === "diesel" && (
                  <>
                    <div className="section-tag">Fuel & Range Parameters</div>
                    <Field label="Fuel Tank Capacity" value={v.fuelCapacityLitres} onChange={(val) => updateVehicleProp(v.id, "fuelCapacityLitres", val)} suffix="Liters" step={10} />
                    <Field label="Reserve Safe Limit Margin" value={v.safeFuelThreshold} onChange={(val) => updateVehicleProp(v.id, "safeFuelThreshold", val)} suffix="%" step={1} />
                    <Field label="Time Per Refuel Stop" value={v.refuelTimeMins} onChange={(val) => updateVehicleProp(v.id, "refuelTimeMins", val)} suffix="Mins" step={5} />
                  </>
                )}

                {v.type === "electric" && (
                  <>
                    <div className="section-tag">Battery Sizing</div>
                    <Field label="Battery Pack Sizing" value={v.batteryCapacity} onChange={(val) => updateVehicleProp(v.id, "batteryCapacity", val)} suffix="kWh" step={25} />
                    <Field label="Pack Replacement Cost" value={v.batteryReplacementCost} onChange={(val) => updateVehicleProp(v.id, "batteryReplacementCost", val)} suffix="₹" step={100000} />

                    <div className="section-tag">Non-Linear Degradation (DoD-Stress + Knee Curve)</div>
                    <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "10px", lineHeight: 1.5 }}>
                      Cycle life scales with how deep each charge cycle is (route Depth-of-Discharge), and SOH fades slowly until a "knee" point, then accelerates toward end-of-life.
                    </div>
                    <Field label="Reference Cycle Life @ 100% DoD" value={v.refCycleLifeAt100DoD} onChange={(val) => updateVehicleProp(v.id, "refCycleLifeAt100DoD", val)} suffix="cycles" step={50} min={1} />
                    <Field label="DoD Stress Exponent (k)" value={v.dodStressExponentK} onChange={(val) => updateVehicleProp(v.id, "dodStressExponentK", val)} suffix="" step={0.05} min={0.1} />
                    <Field label="Knee Point SOH" value={v.kneeSOH} onChange={(val) => updateVehicleProp(v.id, "kneeSOH", val)} suffix="%" step={1} min={v.batterySOHThreshold || 0} max={99} />
                    <Field label="Knee Cycle Fraction (of life)" value={v.kneeCycleFraction} onChange={(val) => updateVehicleProp(v.id, "kneeCycleFraction", val)} suffix="×life" step={0.05} min={0.05} max={0.95} />
                    <Field label="Post-Knee Acceleration Exponent" value={v.postKneeExponent} onChange={(val) => updateVehicleProp(v.id, "postKneeExponent", val)} suffix="" step={0.1} min={1} />

                    <div className="field" style={{ marginTop: 6 }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span className="field-label" style={{ fontWeight: 600 }}>Adaptive Lifecycle Replacement Sizing</span>
                        <span style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>Compute physical replacement limit dynamically based on route range limits?</span>
                      </div>
                      <input type="checkbox" checked={v.useDynamicSOHLimit} onChange={(e) => updateVehicleProp(v.id, "useDynamicSOHLimit", e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "var(--bev)", cursor: "pointer" }} />
                    </div>

                    {!v.useDynamicSOHLimit && (
                      <Field label="Manual Target SOH Trigger" value={v.batterySOHThreshold} onChange={(val) => updateVehicleProp(v.id, "batterySOHThreshold", val)} suffix="%" step={1} />
                    )}
                    <Field label="Reserve Safe Limit Margin (Reserve SoC)" value={v.safeSoCThreshold} onChange={(val) => updateVehicleProp(v.id, "safeSoCThreshold", val)} suffix="%" step={1} />

                    {currentComputed && (
                      <div style={{ background: "var(--panel-alt)", border: "1px dashed var(--border)", borderRadius: "8px", padding: "10px 12px", marginTop: "6px", fontSize: "11.5px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-dim)" }}>Avg. Route Depth-of-Discharge:</span><strong className="num">{(currentComputed.avgDoDFraction * 100).toFixed(1)}%</strong></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-dim)" }}>DoD-Adjusted Cycle Life:</span><strong className="num">{Math.round(currentComputed.cyclesToEOL)} cycles</strong></div>
                      </div>
                    )}
                  </>
                )}

                <div className="section-tag">Tyre Layout & Costing</div>
                <div style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px", display: "flex", gap: "12px", flexDirection: "column" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.5fr 1.5fr", gap: "8px", fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textAlign: "center" }}>
                    <div style={{ textAlign: "left" }}>Axle</div>
                    <div>Tyres</div>
                    <div>Cost/Tyre</div>
                    <div>Life (km)</div>
                  </div>
                  {[{key: "Front", label: "Front"}, {key: "Rear", label: "Rear"}, {key: "Trailer", label: "Trailer"}].map(axle => (
                    <div key={axle.key} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.5fr 1.5fr", gap: "8px", alignItems: "center" }}>
                      <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>{axle.label}</div>
                      <input className="compact-input" type="number" value={v[`tyres${axle.key}`]} onChange={(e) => updateVehicleProp(v.id, `tyres${axle.key}`, parseFloat(e.target.value) || 0)} />
                      <input className="compact-input" type="number" value={v[`tyreCost${axle.key}`]} step={500} onChange={(e) => updateVehicleProp(v.id, `tyreCost${axle.key}`, parseFloat(e.target.value) || 0)} />
                      <input className="compact-input" type="number" value={v[`tyreLife${axle.key}`]} step={5000} onChange={(e) => updateVehicleProp(v.id, `tyreLife${axle.key}`, parseFloat(e.target.value) || 0)} />
                    </div>
                  ))}
                </div>

                <div className="section-tag">Maintenance (AMC) & Residuals</div>
                <Field label="Periodic Maintenance / AMC Rate" value={v.maintCostPerKm} onChange={(val) => updateVehicleProp(v.id, "maintCostPerKm", val)} suffix="₹/km" step={0.1} />
                <Field label="Annual Insurance Rate (on declining IDV)" value={v.insuranceRatePct} onChange={(val) => updateVehicleProp(v.id, "insuranceRatePct", val)} suffix="%" step={0.25} />
                <Field label="Terminal Salvage Value (per vehicle)" value={v.residualPct} onChange={(val) => updateVehicleProp(v.id, "residualPct", val)} suffix="%" step={1} />

                <div className="section-tag">Drivers & Operator Margin</div>
                <Field label="Drivers per Vehicle" value={v.driversPerVehicle} onChange={(val) => updateVehicleProp(v.id, "driversPerVehicle", Math.max(1, Math.round(val)))} suffix="Drivers" step={1} min={1} />
                <Field label="Driver Salary (per driver)" value={v.driverSalaryMonthly} onChange={(val) => updateVehicleProp(v.id, "driverSalaryMonthly", val)} suffix="₹/mo" step={1000} />
                <Field label="Operator Margin (target profit)" value={v.operatorMarginPerTruckMonthly} onChange={(val) => updateVehicleProp(v.id, "operatorMarginPerTruckMonthly", val)} suffix="₹/truck/mo" step={1000} />
                <Field label="Toll Overhead Per Trip (per vehicle)" value={v.tollCostPerTrip} onChange={(val) => updateVehicleProp(v.id, "tollCostPerTrip", val)} suffix="₹" step={250} />

                <div className="section-tag">Miscellaneous Expenses</div>
                <Field label="Misc Cost Per Month (per vehicle)" value={v.miscCostPerMonth} onChange={(val) => updateVehicleProp(v.id, "miscCostPerMonth", val)} suffix="₹/mo" step={500} />
                <TextField label="Expense Notes" value={v.miscCostNotes} onChange={(val) => updateVehicleProp(v.id, "miscCostNotes", val)} placeholder="e.g. permits, parking..." />

                <div className="section-tag">Downtime & Delays</div>
                <Field label="Driver Rest/Delay Factor" value={v.driverRestDelayFactorKm} onChange={(val) => updateVehicleProp(v.id, "driverRestDelayFactorKm", val)} suffix="km / 1 hr delay" step={10} min={10} />
                <Field label="Scheduled Service (per vehicle)" value={v.scheduledDowntimeDays} onChange={(val) => updateVehicleProp(v.id, "scheduledDowntimeDays", val)} suffix="Days/Year" step={1} />
                <Field label="Unscheduled Outages (per vehicle)" value={v.unscheduledDowntimeHrs} onChange={(val) => updateVehicleProp(v.id, "unscheduledDowntimeHrs", val)} suffix="Hours/Year" step={1} />

                {v.type === "electric" && (
                  <>
                    <div className="section-tag">Charger & Depot Capital Cost (Capex)</div>
                    <Field label="Station Setup & Civil Cost" value={v.stationCost} onChange={(val) => updateVehicleProp(v.id, "stationCost", val)} suffix="₹/station" step={100000} />
                    <Field label="Charger Dispenser Unit Cost" value={v.chargerCost} onChange={(val) => updateVehicleProp(v.id, "chargerCost", val)} suffix="₹/unit" step={50000} />
                    <Field label="Default Plugs Per Station" value={v.defaultChargersPerStation || 1} onChange={(val) => updateVehicleProp(v.id, "defaultChargersPerStation", Math.max(1, Math.round(val)))} suffix="plugs/station" step={1} />
                    <Field label="Infra Subsidies / Incentives" value={v.infrastructureTaxCredit} onChange={(val) => updateVehicleProp(v.id, "infrastructureTaxCredit", val)} suffix="%" step={1} />
                    <Field label="Charger Output Speed" value={v.chargeSpeedKW} onChange={(val) => updateVehicleProp(v.id, "chargeSpeedKW", val)} suffix="kW" step={10} />
                    <Field label="Charging Time Margin" value={v.chargingTimeMarginPct} onChange={(val) => updateVehicleProp(v.id, "chargingTimeMarginPct", val)} suffix="%" step={1} />
                    <Field label="Electricity Tariff Rate" value={v.electricityRate} onChange={(val) => updateVehicleProp(v.id, "electricityRate", val)} suffix="₹/kWh" step={0.5} />

                    <div className="section-tag"><Users size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} /> EV Infrastructure Manpower (Opex)</div>
                    <div style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600 }}>Station Manpower</span>
                        <span className="num" style={{ fontSize: "11.5px", color: "var(--bev)" }}>
                          {currentComputed ? currentComputed.autoStationManpower : 0} staff <small style={{ color: "var(--text-dim)" }}>(Auto-calculated: 3 shifts/station)</small>
                        </span>
                      </div>
                      <Field label="Cost per Manpower" value={v.costPerManpower || 25000} onChange={(val) => updateVehicleProp(v.id, "costPerManpower", val)} suffix="₹/mo" step={1000} />
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "10px", marginTop: "10px", borderTop: "1px dashed var(--border)", paddingTop: "10px" }}>
                        <Field label="Ops Incharge (#)" value={v.opsInchargeCount !== undefined ? v.opsInchargeCount : 2} onChange={(val) => updateVehicleProp(v.id, "opsInchargeCount", Math.round(val))} step={1} />
                        <Field label="Operations Cost" value={v.opsInchargeCost || 70000} onChange={(val) => updateVehicleProp(v.id, "opsInchargeCost", val)} suffix="₹/mo" step={2500} />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "10px", marginTop: "6px" }}>
                        <Field label="Supporting (#)" value={v.supportingManpowerCount !== undefined ? v.supportingManpowerCount : 6} onChange={(val) => updateVehicleProp(v.id, "supportingManpowerCount", Math.round(val))} step={1} />
                        <Field label="Supporting Cost" value={v.supportingManpowerCost || 40000} onChange={(val) => updateVehicleProp(v.id, "supportingManpowerCost", val)} suffix="₹/mo" step={2500} />
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", paddingTop: "8px", borderTop: "1px solid var(--border)", fontSize: "12px" }}>
                        <span>Total Monthly Infra Manpower:</span>
                        <strong className="num" style={{ color: "var(--bev)" }}>{inr(currentComputed ? currentComputed.totalMonthlyStationManpower : 0)}/mo</strong>
                      </div>
                    </div>

                    <div className="section-tag"><Sparkles size={12} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} /> TCO-Optimal Charging Network</div>
                    <div className="optimizer-box">
                      <div style={{ fontSize: "11.5px", color: "var(--text-dim)", marginBottom: "10px", lineHeight: 1.5 }}>
                        Tries every combination of terminal depot-charger placement across your route segments to find the lowest lifecycle NPV TCO.
                      </div>
                      {routeSegments.length <= 12 && (
                        <button className="mini-btn-outline" onClick={() => handleRunOptimizer(v.id)} disabled={optimizerRunning === v.id}>
                          <GitBranch size={13} /> {optimizerRunning === v.id ? "Running..." : "Find Optimal Network"}
                        </button>
                      )}

                      {optResult && currentComputed && (
                        <div className="optimizer-result">
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ color: "var(--text-dim)" }}>Current network TCO:</span><strong className="num">{inrCompact(currentComputed.npvTCOSum)}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ color: "var(--text-dim)" }}>Optimal network TCO:</span><strong className="num" style={{ color: "var(--good)" }}>{inrCompact(optResult.npvTCOSum)}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", borderTop: "1px dashed var(--border)", paddingTop: "6px" }}>
                            <span style={{ color: "var(--text-dim)" }}>Potential savings:</span>
                            <strong className="num" style={{ color: currentComputed.npvTCOSum - optResult.npvTCOSum > 0 ? "var(--good)" : "var(--text-dim)" }}>
                              {inrCompact(Math.max(0, currentComputed.npvTCOSum - optResult.npvTCOSum))}
                            </strong>
                          </div>
                          {optResult.depotFlags.length !== routeSegments.length ? (
                            <span style={{ fontSize: "11.5px", color: "var(--diesel)" }}>Route has changed. Re-run to refresh.</span>
                          ) : currentComputed.npvTCOSum - optResult.npvTCOSum > 1 ? (
                            <button className="mini-btn" onClick={() => handleApplyOptimalNetwork(v.id)}><CheckCircle2 size={13} /> Apply This Network</button>
                          ) : (
                            <span style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>Current depot placement is already optimal.</span>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="section-tag">Financing parameters</div>
                <div className="field">
                  <span className="field-label">Financing Structure</span>
                  <div className="seg">
                    <button className={v.financing === "cash" ? "active" : ""} onClick={() => updateVehicleProp(v.id, "financing", "cash")}>Equity / Cash</button>
                    <button className={v.financing === "emi" ? "active" : ""} onClick={() => updateVehicleProp(v.id, "financing", "emi")}>Debt / Loan</button>
                  </div>
                </div>
                {v.financing === "emi" && (
                  <>
                    <Field label="Equity Contribution" value={v.downPaymentPct} onChange={(val) => updateVehicleProp(v.id, "downPaymentPct", val)} suffix="%" step={5} />
                    <Field label="Annual Interest Rate" value={v.interestRate} onChange={(val) => updateVehicleProp(v.id, "interestRate", val)} suffix="%" step={0.25} />
                    <Field label="Loan Duration Window" value={v.loanTenure} onChange={(val) => updateVehicleProp(v.id, "loanTenure", val)} suffix="Years" step={1} />
                  </>
                )}
              </div>
            );})}
          </div>
        </div>
      )}

      {/* SECTION 3: Route Planner */}
      {activeTab === 'route' && (
        <div className="panel">
          <h2><MapPin size={18} color="var(--bev)" /> 3. Route Planner & Charging Network</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="route-table">
              <thead>
                <tr>
                  <th>From Node</th>
                  <th>To Node</th>
                  <th>Distance (km)</th>
                  <th>Monthly Tonnage Demand</th>
                  <th>Payload (per vehicle)</th>
                  <th>Avg Speed (km/h)</th>
                  <th style={{ textAlign: "center" }}>Depot Charger at Target?</th>
                  <th>Custom Duty Cycle</th>
                  <th style={{ width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {routeSegments.map((seg) => {
                  const activeStretchesSum = seg.stretches.reduce((sum, st) => sum + st.percentage, 0);
                  return (
                    <React.Fragment key={seg.id}>
                      <tr>
                        <td><input type="text" value={seg.from} onChange={(e) => updateSegmentProp(seg.id, "from", e.target.value)} /></td>
                        <td><input type="text" value={seg.to} onChange={(e) => updateSegmentProp(seg.id, "to", e.target.value)} /></td>
                        <td><input type="number" value={seg.distance} onChange={(e) => updateSegmentProp(seg.id, "distance", parseFloat(e.target.value) || 0)} /></td>
                        <td>
                          <input type="number" value={seg.monthlyTonnage || 0} step={100} onChange={(e) => updateSegmentProp(seg.id, "monthlyTonnage", parseFloat(e.target.value) || 0)} style={{ width: "95px" }} />
                          <div style={{ fontSize: "9.5px", color: "var(--text-dim)", marginTop: "2px" }}>T/month · 0 = unbounded</div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            {vehicles.map((v) => {
                              const val = getSegPayload(seg, v.id);
                              const cap = getPayloadCap(v);
                              const isOver = val > cap;
                              return (
                                <span key={v.id} className="num" style={{ fontSize: "11px", color: isOver && !v.allowOverloading ? "var(--bad)" : "var(--text-dim)", whiteSpace: "nowrap" }}>
                                  <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: colorForVehicle(v, vehicles), marginRight: "5px" }} />
                                  {val.toFixed(1)}T {isOver && v.allowOverloading ? "(Over)" : ""}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td><input type="number" value={seg.avgSpeed} onChange={(e) => updateSegmentProp(seg.id, "avgSpeed", parseFloat(e.target.value) || 0)} /></td>
                        <td style={{ textAlign: "center" }}>
                          <input type="checkbox" checked={seg.hasDepotAtTo} onChange={(e) => updateSegmentProp(seg.id, "hasDepotAtTo", e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "var(--bev)", cursor: "pointer" }} />
                        </td>
                        <td>
                          <button className="expand-btn" onClick={() => setExpandedSegmentId(expandedSegmentId === seg.id ? null : seg.id)}>
                            {expandedSegmentId === seg.id ? "Close" : `Configure (${activeStretchesSum}%)`}
                          </button>
                        </td>
                        <td>
                          <button className="remove-btn" onClick={() => handleRemoveSegment(seg.id)} disabled={routeSegments.length <= 1} style={{ background: "transparent", border: "none", color: "var(--bad)", cursor: "pointer" }}><Trash2 size={16} /></button>
                        </td>
                      </tr>

                      {expandedSegmentId === seg.id && (
                        <tr>
                          <td colSpan="9">
                            <div className="stretch-drawer">
                              <div style={{ marginBottom: "16px" }}>
                                <span style={{ fontWeight: 600, fontSize: "13px", display: "block", marginBottom: "10px" }}>Cargo Payload per Vehicle</span>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  {vehicles.map((v) => {
                                    const mode = payloadModes[v.id] || "T";
                                    const cap = getPayloadCap(v);
                                    const currentVal = getSegPayload(seg, v.id);
                                    const warnKey = `${seg.id}_${v.id}`;
                                    const isWarning = !!payloadWarnings[warnKey];
                                    const multiplier = computeWeightedMultiplier(seg.stretches, v.allowOverloading ? currentVal : Math.min(currentVal, cap), v.type, dieselMatrix, evMatrix);

                                    return (
                                      <div key={v.id} style={{ background: "var(--panel)", border: `1px solid ${isWarning && !v.allowOverloading ? "var(--bad)" : "var(--border)"}`, borderRadius: "8px", padding: "10px 12px" }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "160px" }}>
                                            {v.type === "electric" ? <Zap size={13} color="var(--bev)" /> : <Fuel size={13} color="var(--diesel)" />}
                                            <span style={{ fontSize: "12.5px", fontWeight: 600 }}>{v.name}</span>
                                          </div>
                                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <span style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>Max {cap.toFixed(1)}T</span>
                                            <div className="field-input" style={{ width: "fit-content" }}>
                                              <input
                                                type="number" value={mode === "%" ? (cap > 0 ? (currentVal / cap) * 100 : 0).toFixed(1) : currentVal}
                                                max={v.allowOverloading ? undefined : (mode === "%" ? 100 : cap)} min={0} step={mode === "%" ? 1 : 0.5}
                                                onChange={(e) => {
                                                  const raw = parseFloat(e.target.value) || 0;
                                                  const newT = mode === "%" ? (raw / 100) * cap : raw;
                                                  updateSegmentVehiclePayload(seg.id, v.id, newT, cap, v.allowOverloading);
                                                }}
                                                style={{ width: "70px", padding: "6px" }}
                                              />
                                              <span className="field-suffix" style={{ paddingRight: 6 }}>{mode === "%" ? "%" : "T"}</span>
                                            </div>
                                            <button className="expand-btn" style={{ padding: "4px 8px", fontSize: "10px" }} onClick={() => setPayloadModes(p => ({...p, [v.id]: mode === "%" ? "T" : "%"}))}>
                                              {mode === "%" ? "Use Tonnes" : "Use %"}
                                            </button>
                                            <span className="num" style={{ fontSize: "10.5px", color: "var(--text-dim)", marginLeft: 6 }}>×{multiplier.toFixed(3)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="stretch-grid">
                                {ROAD_TYPES.map((road) => (
                                  <div key={road} className="stretch-card">
                                    <div style={{ fontWeight: 700, fontSize: "10px", textTransform: "uppercase", marginBottom: "8px", color: "var(--bev)", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>{road}</div>
                                    {TRAFFIC_CONDITIONS.map((traffic) => {
                                      const matched = seg.stretches.find(st => st.roadType === road && st.traffic === traffic);
                                      const currentVal = matched ? matched.percentage : 0;
                                      return (
                                        <div key={traffic} className="field" style={{ marginBottom: "6px" }}>
                                          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>{traffic}</span>
                                          <div className="field-input">
                                            <input type="number" value={currentVal} onChange={(e) => updateStretchPercentage(seg.id, road, traffic, parseFloat(e.target.value) || 0)} style={{ width: "45px", padding: "4px", fontSize: "11.5px" }} />
                                            <span style={{ fontSize: "9px", paddingRight: "4px" }}>%</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button className="add-btn" style={{ marginTop: "16px" }} onClick={handleAddSegment}>
            <Plus size={14} /> Add Route Segment
          </button>
        </div>
      )}

      {/* SECTION 4: Efficiency Matrices */}
      {activeTab === 'matrices' && (
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: 0, padding: 0, borderBottom: 'none' }}><Activity size={18} color="var(--bev)" /> 4. Efficiency Multipliers</h2>
            <div className="seg" style={{ width: "240px" }}>
              <button className={matrixEditMode === "diesel" ? "active" : ""} onClick={() => setMatrixEditMode("diesel")}>Diesel Matrices</button>
              <button className={matrixEditMode === "electric" ? "active" : ""} onClick={() => setMatrixEditMode("electric")}>EV Matrices</button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="route-table" style={{ background: "var(--panel-alt)", borderRadius: "8px" }}>
              <thead>
                <tr>
                  <th>Road Type</th>
                  <th>Traffic Condition</th>
                  <th style={{ textAlign: "right" }}>0T Payload</th>
                  <th style={{ textAlign: "right" }}>20T Payload</th>
                  <th style={{ textAlign: "right" }}>40T Payload</th>
                  <th style={{ textAlign: "right" }}>60T Payload</th>
                </tr>
              </thead>
              <tbody>
                {ROAD_TYPES.map((road) => (
                  <React.Fragment key={road}>
                    {TRAFFIC_CONDITIONS.map((traffic, tIdx) => {
                      const matrixState = matrixEditMode === 'diesel' ? dieselMatrix : evMatrix;
                      const roadData = matrixState[road] || {};
                      const trafficData = roadData[traffic] || {};
                      
                      return (
                        <tr key={`${road}-${traffic}`}>
                          {tIdx === 0 && <td rowSpan={3} style={{ fontWeight: 600, verticalAlign: "middle", borderBottom: "2px solid var(--border)", borderRight: "1px solid var(--border)" }}>{road}</td>}
                          <td style={{ borderBottom: tIdx === 2 ? "2px solid var(--border)" : "1px solid var(--border)" }}>{traffic}</td>
                          {PAYLOAD_KEYS.map(payload => (
                            <td key={payload} style={{ borderBottom: tIdx === 2 ? "2px solid var(--border)" : "1px solid var(--border)" }}>
                              <div className="field-input" style={{ width: "80px", marginLeft: "auto" }}>
                                <input 
                                  type="number" 
                                  step="0.01" 
                                  value={trafficData[payload] !== undefined ? trafficData[payload] : 1.0} 
                                  onChange={(e) => updateMatrixValue(matrixEditMode, road, traffic, payload, parseFloat(e.target.value) || 0)} 
                                  style={{ width: "80px" }} 
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 5: Analytics Dashboard */}
      {activeTab === 'results' && (
        <div className="panel" style={{ border: "1px solid var(--bev)", boxShadow: "var(--shadow-glow)" }}>
          <h2 style={{ color: "var(--bev)", marginBottom: "16px" }}><TrendingUp size={20} /> 5. Analytics Dashboard</h2>
          
          {results.firstDiesel && results.firstElectric && (
            <div className="breakeven-strip">
              <TrendingUp size={22} style={{ flexShrink: 0, color: "var(--bev)" }} />
              <strong style={{ fontSize: "13.5px" }}>
                {results.breakevenYear !== null
                  ? `Breakeven: EV lifecycle TCO becomes cheaper than Diesel from Year ${results.breakevenYear.toFixed(1)}`
                  : "No breakeven within the analysis horizon"}
              </strong>
            </div>
          )}

          <div className="sub-tabs">
            {RESULT_TABS.map(tab => (
              <button 
                key={tab.id} 
                className={`sub-tab ${activeResultTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveResultTab(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-tab 1: Summary & KPIs */}
          {activeResultTab === 'kpi' && (
            <div className="anim-fade">
              <div className="kpi-grid">
                {results.computedVehicles.map((v) => (
                  <div key={v.id} className="kpi-card" style={{ borderTop: `4px solid ${colorForVehicle(v, results.computedVehicles)}` }}>
                    <div className="kpi-label">{v.name} ({v.fleetSizeRequired} Units)</div>
                    <div className="kpi-val num" style={{ color: colorForVehicle(v, results.computedVehicles) }}>{inrCompact(v.npvTCOSum)}</div>
                    <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>Total Cost / Ton</span>
                        <span className="num" style={{ fontWeight: 700, fontSize: "13px" }}>₹{Math.round(v.loopCostPerTonneTrip)}/Ton</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>Cost / Ton-km</span>
                        <span className="num" style={{ fontWeight: 700, fontSize: "12px" }}>₹{v.loopCostPerTonneKm.toFixed(3)}/Ton-km</span>
                      </div>
                    </div>
                    <div className="kpi-sub">
                      Turnaround: <strong className="num">{v.turnaroundCycleHrs.toFixed(2)} Hrs</strong><br />
                      Utilization: <strong className="num">{v.utilizationPctComputed.toFixed(1)}%</strong><br />
                      Effective Economy: <strong className="num">{v.avgRouteEconomy.toFixed(2)} {v.type === "diesel" ? "km/l" : "km/kWh"}</strong><br />
                      {v.type === "electric" ? (
                        <>
                          Unique Stations: <strong className="num">{v.uniqueStationsCount} Stops</strong><br />
                          Total Sized Dispensers: <strong className="num">{v.totalChargersNeeded} Plugs</strong>
                        </>
                      ) : (
                        <>
                          Avg. Refuels/Loop: <strong className="num">{v.refuelingStopsCount.toFixed(1)} Stops</strong>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {results.computedVehicles.length > 0 && (
                <div style={{ marginBottom: "28px" }}>
                  <h3 style={{ fontSize: "14px", textTransform: "uppercase", fontWeight: 700, marginBottom: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "6px", color: "var(--text)" }}>
                    <Activity size={15} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6, color: "var(--bev)" }} />
                    Fleet Operational Radar Snapshot
                  </h3>
                  <div style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
                    <ResponsiveContainer width="100%" height={320}>
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={results.radarData}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="metric" stroke="var(--text-dim)" tick={{ fill: 'var(--text)', fontSize: 11, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--border)" tick={{ fill: 'var(--text-dim)', fontSize: 9 }} />
                        {results.computedVehicles.map(v => (
                          <Radar key={v.id} name={v.name} dataKey={v.name} stroke={colorForVehicle(v, results.computedVehicles)} fill={colorForVehicle(v, results.computedVehicles)} fillOpacity={0.25} />
                        ))}
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                        <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: "28px" }}>
                <h3 style={{ fontSize: "14px", textTransform: "uppercase", fontWeight: 700, marginBottom: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "6px", color: "var(--text)" }}>
                  <Clock size={15} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6, color: "var(--bev)" }} />
                  Time Allocation Breakdown (% of Trip Turnaround Cycle)
                </h3>
                <div style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={results.timeUtilizationData} layout="vertical" margin={{ top: 5, right: 25, left: 40, bottom: 5 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} unit="%" stroke="var(--text-dim)" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
                      <YAxis type="category" dataKey="name" stroke="var(--text-dim)" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} width={140} />
                      <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} formatter={(v) => `${Number(v).toFixed(1)}%`} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Driving" stackId="a" fill="#00e5a3" />
                      <Bar dataKey="Load/Unload" stackId="a" fill="#818cf8" />
                      <Bar dataKey="Refuel / Charge" stackId="a" fill="#f43f5e" />
                      <Bar dataKey="Rest/Queue" stackId="a" fill="#64748b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ marginTop: "16px", marginBottom: "24px" }}>
                <h3 style={{ fontSize: "14px", textTransform: "uppercase", fontWeight: 700, marginBottom: "6px", borderBottom: "1px solid var(--border)", paddingBottom: "6px", color: "var(--text)" }}>
                  <DollarSign size={15} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6, color: "var(--bev)" }} />
                  Capital Deployment & Infrastructure Summary
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table className="time-split-table">
                    <thead>
                      <tr>
                        <th>Vehicle</th><th>Fleet Size</th><th>On-Road Price / Truck</th><th>Equity (Down Payment)</th>
                        <th>Charging Infra Capex (Total)</th><th>Infra Capex Allocated / Truck</th><th>Loaded Capex / Truck</th><th>Total Fleet Upfront Capex</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.computedVehicles.map((v) => (
                        <tr key={v.id}>
                          <td style={{ color: colorForVehicle(v, results.computedVehicles), fontWeight: 700 }}>{v.name}</td>
                          <td className="num">{v.fleetSizeRequired}</td>
                          <td className="num">{inr(v.totalUpfrontGSTPrice)}</td>
                          <td className="num">{inr(v.loanUpfrontDownpayment)}</td>
                          <td className="num">{v.type === "electric" ? inr(v.capitalSetupInfra) : "—"}</td>
                          <td className="num">{v.type === "electric" ? inr(v.infraCapexPerTruck) : "—"}</td>
                          <td className="num" style={{ fontWeight: 700, color: colorForVehicle(v, results.computedVehicles) }}>{inr(v.loadedCapexPerTruckOnRoad)}</td>
                          <td className="num" style={{ fontWeight: 700 }}>{inrCompact(v.totalFleetUpfrontCapex)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 2: Unit Economics */}
          {activeResultTab === 'segment' && (
            <div className="anim-fade">
              <div style={{ marginBottom: "28px" }}>
                <h3 style={{ fontSize: "14px", textTransform: "uppercase", fontWeight: 700, marginBottom: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "6px", color: "var(--text)" }}>
                  <BarChart3 size={15} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6, color: "var(--bev)" }} />
                  Estimated Segment Freight Rates (₹/Ton)
                </h3>
                <div style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={results.segmentFreightData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="var(--text-dim)" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} />
                      <YAxis stroke="var(--text-dim)" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} tickFormatter={(v) => `₹${v}`} width={65} />
                      <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} formatter={(v) => `₹${v} / Ton`} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {results.computedVehicles.map(v => (
                        <Bar key={v.id} dataKey={v.name} fill={colorForVehicle(v, results.computedVehicles)} radius={[4, 4, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "14px", textTransform: "uppercase", fontWeight: 700, marginBottom: "6px", borderBottom: "1px solid var(--border)", paddingBottom: "6px", color: "var(--text)" }}>
                  <Route size={15} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6, color: "var(--bev)" }} />
                  Cost & Estimated Freight Rate by Segment
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table className="seg-cost-table">
                    <thead>
                      <tr>
                        <th>Segment / Vehicle</th>
                        {results.computedVehicles.map((v) => (
                          <th key={v.id} style={{ color: colorForVehicle(v, results.computedVehicles), minWidth: '150px' }}>{v.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ background: "var(--panel-alt)" }}>
                        <td><strong>Total Loop (Socialized)</strong><span style={{ display: "block", fontSize: "9.5px", color: "var(--text-dim)", marginTop: "2px" }}>Per-ton sides added; / total distance</span></td>
                        {results.computedVehicles.map((v) => (
                          <td key={v.id} className="num" style={{ color: colorForVehicle(v, results.computedVehicles) }}>
                            <div style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>Cost: ₹{Math.round(v.loopCostPerTonneTrip)} / Ton</div>
                            <div style={{ fontSize: "10.5px", color: "var(--text-dim)", marginTop: "2px" }}>Cost: ₹{v.loopCostPerTonneKm.toFixed(3)} / Ton-km</div>
                            <div style={{ fontWeight: 700, marginTop: "5px" }}>Freight: ₹{Math.round(v.totalFreightRatePerTonneTrip)} / Ton</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, marginTop: "2px" }}>₹{v.requiredFreightRatePerTonneKm.toFixed(3)} / Ton-km</div>
                          </td>
                        ))}
                      </tr>
                      {routeSegments.map((seg, segIdx) => (
                        <tr key={seg.id}>
                          <td>{seg.from} → {seg.to} <span style={{ color: "var(--text-dim)", display: "block", fontSize: "11px", marginTop: "2px" }}>({seg.distance} km)</span></td>
                          {results.computedVehicles.map((v) => {
                            const segData = v.segmentCostPerTonneKm[segIdx];
                            if (!segData || segData.freightRatePerTonneSeg === null) return <td key={v.id} className="num" style={{ color: "var(--text-dim)" }}>—</td>;
                            return (
                              <td key={v.id} className="num">
                                <div style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>Cost: ₹{Math.round(segData.costPerTonneSeg)} / Ton</div>
                                <div style={{ fontSize: "10.5px", color: "var(--text-dim)", marginTop: "2px" }}>Cost: ₹{segData.costPerTonneKmSeg.toFixed(3)} / Ton-km</div>
                                <div style={{ fontWeight: 700, color: "var(--text)", marginTop: "5px" }}>Freight: ₹{Math.round(segData.freightRatePerTonneSeg)} / Ton</div>
                                <div style={{ fontSize: "11px", color: "var(--text)", marginTop: "2px" }}>₹{segData.freightRatePerTonneKmSeg.toFixed(3)} / Ton-km</div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 3: Timeline & Breakdown */}
          {activeResultTab === 'timeline' && (
            <div className="anim-fade">
              <div style={{ marginTop: "16px" }}>
                <h3 style={{ fontSize: "14px", textTransform: "uppercase", fontWeight: 700, marginBottom: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "6px", color: "var(--text)" }}>
                  Lifecycle Cost Accrual Over Project Horizon ({results.years} Years) {enableDiscounting ? "(Discounted Present Value NPV)" : "(Nominal Cashflow)"}
                </h3>
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={results.chartData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="year" stroke="var(--text-dim)" tick={{ fontSize: 11, fill: "var(--text-dim)" }} />
                    <YAxis stroke="var(--text-dim)" tick={{ fontSize: 11, fill: "var(--text-dim)" }} tickFormatter={(v) => inrCompact(v)} width={80} />
                    <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} formatter={(v) => inr(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {results.computedVehicles.map((v) => (
                      <Line key={v.id} type="monotone" dataKey={v.name} stroke={colorForVehicle(v, results.computedVehicles)} strokeWidth={2.5} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={{ marginTop: "32px" }}>
                <h3 style={{ fontSize: "14px", textTransform: "uppercase", fontWeight: 700, marginBottom: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "6px", color: "var(--text)" }}>
                  Cost Category Breakdown Comparison
                </h3>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart
                    data={[
                      { category: "Capital & Infra", ...results.computedVehicles.reduce((acc, v) => ({ ...acc, [v.name]: v.breakdown.upfront }), {}) },
                      { category: "Fuel/Energy", ...results.computedVehicles.reduce((acc, v) => ({ ...acc, [v.name]: v.breakdown.fuelOrEnergy }), {}) },
                      { category: "EMI/Debt", ...results.computedVehicles.reduce((acc, v) => ({ ...acc, [v.name]: v.breakdown.emi }), {}) },
                      { category: "AMC & Ins", ...results.computedVehicles.reduce((acc, v) => ({ ...acc, [v.name]: v.breakdown.maintenance + v.breakdown.insurance }), {}) },
                      { category: "Drivers & Wages", ...results.computedVehicles.reduce((acc, v) => ({ ...acc, [v.name]: v.breakdown.wages }), {}) },
                      { category: "Operator Margin", ...results.computedVehicles.reduce((acc, v) => ({ ...acc, [v.name]: v.breakdown.operatorMargin }), {}) },
                      { category: "Tolls & Tyres", ...results.computedVehicles.reduce((acc, v) => ({ ...acc, [v.name]: v.breakdown.tolls + v.breakdown.tyres }), {}) },
                      { category: "Battery Swaps", ...results.computedVehicles.reduce((acc, v) => ({ ...acc, [v.name]: v.breakdown.batteryReplacements }), {}) },
                      { category: "Infra Manpower", ...results.computedVehicles.reduce((acc, v) => ({ ...acc, [v.name]: v.breakdown.stationManpower }), {}) },
                      { category: "Misc Overheads", ...results.computedVehicles.reduce((acc, v) => ({ ...acc, [v.name]: v.breakdown.misc }), {}) }
                    ]}
                    margin={{ top: 20, right: 30, left: 10, bottom: 70 }}
                  >
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="category" stroke="var(--text-dim)" tick={{ fontSize: 11, fill: "var(--text-dim)" }} interval={0} angle={-35} textAnchor="end" height={70} />
                    <YAxis stroke="var(--text-dim)" tick={{ fontSize: 11, fill: "var(--text-dim)" }} tickFormatter={(v) => inrCompact(v)} width={80} />
                    <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} formatter={(v) => inr(v)} />
                    <Legend wrapperStyle={{ fontSize: 12, top: 0 }} />
                    {results.computedVehicles.map((v, idx) => (
                      <Bar key={v.id} dataKey={v.name} fill={colorForVehicle(v, results.computedVehicles)}>
                         {idx > 0 && <LabelList dataKey={v.name} content={(props) => renderCustomBarLabel(props)} />}
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ marginTop: "36px", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "14px", textTransform: "uppercase", fontWeight: 700, marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "6px", color: "var(--text)" }}>
                  <PieChartIcon size={15} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6, color: "var(--bev)" }} />
                  Cost Breakdown Split (Per Vehicle)
                </h3>
                <div className="grid-2">
                  {results.computedVehicles.map((v) => {
                    const rawItems = [
                      { name: "Capital & Infra", value: Math.max(0, v.breakdown.upfront) },
                      { name: "Fuel/Energy", value: Math.max(0, v.breakdown.fuelOrEnergy) },
                      { name: "EMI/Debt", value: Math.max(0, v.breakdown.emi) },
                      { name: "Maintenance & Ins", value: Math.max(0, v.breakdown.maintenance + v.breakdown.insurance) },
                      { name: "Wages & Drivers", value: Math.max(0, v.breakdown.wages) },
                      { name: "Tolls & Tyres", value: Math.max(0, v.breakdown.tolls + v.breakdown.tyres) },
                      { name: "Battery Replacements", value: Math.max(0, v.breakdown.batteryReplacements) },
                      { name: "Depot Upkeep", value: Math.max(0, v.breakdown.stationManpower + v.breakdown.infraLandLease) },
                      { name: "Misc Overheads", value: Math.max(0, v.breakdown.misc) },
                      { name: "Operator Margin", value: Math.max(0, v.breakdown.operatorMargin) },
                    ].filter(item => item.value > 0);

                    const totalSum = rawItems.reduce((sum, item) => sum + item.value, 0);

                    return (
                      <div key={v.id} className="donut-card" style={{ borderTop: `4px solid ${colorForVehicle(v, results.computedVehicles)}` }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", marginBottom: "12px", color: "var(--text)" }}>
                          {v.name} Total TCO Split
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={rawItems}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={85}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {rawItems.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLOR_MAP[entry.name] || '#9ca3af'} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "12px" }}
                              formatter={(val) => [`${inr(val)} (${totalSum > 0 ? ((val / totalSum) * 100).toFixed(1) : 0}%)`, "Cost"]}
                            />
                          </PieChart>
                        </ResponsiveContainer>

                        <div className="donut-legend">
                          {rawItems.map((item) => {
                            const pct = totalSum > 0 ? ((item.value / totalSum) * 100).toFixed(1) : 0;
                            return (
                              <div key={item.name} className="donut-legend-item">
                                <span className="donut-legend-color" style={{ background: PIE_COLOR_MAP[item.name] || '#9ca3af' }} />
                                <span>{item.name} <strong className="num" style={{ color: "var(--text)" }}>({pct}%)</strong></span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 4: EV Infrastructure & Sizing */}
          {activeResultTab === 'battery' && (
            <div className="anim-fade">
              {!results.computedVehicles.some(v => v.type === "electric") ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)", fontStyle: "italic" }}>
                  No Electric Vehicles are currently configured in the fleet to analyze infrastructure for.
                </div>
              ) : (
                <>
                  <div style={{ background: "var(--panel-alt)", padding: "2px", borderRadius: "14px", marginBottom: "24px" }}>
                    {results.computedVehicles.map((v) => {
                      if (v.type !== "electric") return null;
                      const dod = 100 - (v.safeSoCThreshold || 0);
                      const flowSequence = buildFlowSequence(v, routeSegments);

                      return (
                        <div key={v.id} style={{ marginBottom: "10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
                            <strong style={{ fontSize: "15px", color: colorForVehicle(v, results.computedVehicles), display: "flex", alignItems: "center", gap: "6px" }}>
                              <Zap size={16} /> {v.name} Network Layout
                            </strong>
                            <div style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>
                              Usable DOD: <strong className="num" style={{ color: "var(--bev)" }}>{dod.toFixed(0)}%</strong> · Sized Plugs: <strong className="num">{v.totalChargersNeeded} plugs</strong>
                            </div>
                          </div>

                          {flowSequence.length === 0 ? (
                            <div style={{ fontSize: "12.5px", color: "var(--text-dim)", padding: "0 20px 20px" }}>No stops configured on this route loop.</div>
                          ) : (
                            <FlowCanvas 
                              v={v} 
                              flowSequence={flowSequence} 
                              chargingStationOverrides={chargingStationOverrides} 
                              updateChargingStationOverride={updateChargingStationOverride} 
                              resetChargingStationOverride={resetChargingStationOverride} 
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid-2" style={{ marginBottom: "24px" }}>
                    <div className="kpi-card" style={{ background: "var(--panel)" }}>
                      <div className="kpi-label"><Activity size={15} style={{ marginRight: 6 }} /> Battery SOH Degradation Timeline (% SOH)</div>
                      <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "10px" }}>
                        Non-linear knee degradation model reflecting real-world LFP pack chemistry & DoD fatigue.
                      </div>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={results.multiEvSohData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                          <XAxis dataKey="month" interval={11} tick={{ fontSize: 10, fill: "var(--text-dim)" }} stroke="var(--border)" tickFormatter={(m) => `Y${Math.floor(Number(m) / 12)}`} />
                          <YAxis domain={[50, 100]} tick={{ fontSize: 10, fill: "var(--text-dim)" }} stroke="var(--border)" width={35} />
                          <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "11px" }} formatter={(val) => `${val}% SOH`} labelFormatter={(m) => `Month ${m} (Year ${(Number(m) / 12).toFixed(1)})`} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          {results.evVehicles.map((v) => (
                            <Line key={v.id} type="monotone" dataKey={v.name} stroke={colorForVehicle(v, results.computedVehicles)} strokeWidth={2.2} dot={{ r: 2 }} />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="kpi-card" style={{ background: "var(--panel)" }}>
                      <div className="kpi-label"><Battery size={15} style={{ marginRight: 6 }} /> Indicative Operational Range Over Lifecycle (km)</div>
                      <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "10px" }}>
                        Effective usable range trajectory as the battery pack ages and is restored over time.
                      </div>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={results.multiEvRangeData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                          <XAxis dataKey="month" interval={11} tick={{ fontSize: 10, fill: "var(--text-dim)" }} stroke="var(--border)" tickFormatter={(m) => `Y${Math.floor(Number(m) / 12)}`} />
                          <YAxis tick={{ fontSize: 10, fill: "var(--text-dim)" }} stroke="var(--border)" width={45} tickFormatter={(val) => `${val} km`} />
                          <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "11px" }} formatter={(val) => `${val} km`} labelFormatter={(m) => `Month ${m} (Year ${(Number(m) / 12).toFixed(1)})`} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          {results.evVehicles.map((v) => (
                            <Line key={v.id} type="monotone" dataKey={v.name} stroke={colorForVehicle(v, results.computedVehicles)} strokeWidth={2.2} dot={{ r: 2 }} />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={{ marginBottom: "24px" }} className="grid-auto-fit">
                    {results.computedVehicles.map((v) => {
                      if (v.type !== "electric") return null;
                      return (
                        <div key={v.id} className="kpi-card" style={{ background: "var(--panel)", borderLeft: `4px solid ${colorForVehicle(v, results.computedVehicles)}` }}>
                          <div className="kpi-label">{v.name} Battery Sizing & Lifecycle</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Theoretical Range (100% SOH):</span><strong className="num" style={{ fontSize: "12px" }}>{Math.round(v.maxTheoreticalRange)} km</strong></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Op. Range at Start (100% SOH):</span><strong className="num cyber-badge badge-info" style={{ fontSize: "11px" }}>{Math.round(v.operationalRangeAtStart)} km</strong></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Op. Range at SOH Limit:</span><strong className="num cyber-badge badge-warn" style={{ fontSize: "11px" }}>{Math.round(v.operationalRangeAtSOHLimit)} km</strong></div>
                            <hr style={{ border: 0, borderBottom: "1px solid var(--border)", margin: "4px 0" }} />
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Avg. Route Depth-of-Discharge:</span><strong className="num" style={{ fontSize: "12px" }}>{(v.avgDoDFraction * 100).toFixed(1)}%</strong></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "12px", color: "var(--text-dim)" }}>DoD-Adjusted Cycle Life:</span><strong className="num" style={{ fontSize: "12px" }}>{Math.round(v.cyclesToEOL)} cycles</strong></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Critical physical range SOH:</span><strong className="num" style={{ fontSize: "12px" }}>{v.criticalSOHLimit.toFixed(1)}% SOH</strong></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Resolved SOH limit:</span><strong className="num" style={{ fontSize: "12px", fontWeight: "bold", color: "var(--bad)" }}>{v.resolvedSOHReplacementLimit.toFixed(1)}% SOH</strong></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Analysis end SOH (Year {results.years}):</span><strong className="num" style={{ fontSize: "12px" }}>{v.currentSOH.toFixed(1)}%</strong></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Swaps Completed (Per Vehicle):</span><strong className="num" style={{ fontSize: "12px", fontWeight: "bold", color: "var(--bev)" }}>{v.replacementsPerVehicle} Swaps</strong></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Total Fleet Battery Swaps:</span><strong className="num" style={{ fontSize: "12px" }}>{v.batterySetsReplacedCount} Packs</strong></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}

function Field({ label, value, onChange, suffix, step = 1, min = 0, max }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="field-input">
        <input type="number" value={value} step={step} min={min} max={max} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="field-input" style={{ flex: 1.2 }}>
        <input type="text" value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", textAlign: "left" }} />
      </div>
    </div>
  );
}

function inr(value) {
  if (value === null || value === undefined || isNaN(value)) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function inrCompact(value) {
  if (value === null || value === undefined || isNaN(value)) return "₹0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)} K`;
  return `${sign}₹${abs.toFixed(0)}`;
}