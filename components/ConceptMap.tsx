import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Concept, MasteryLevel } from '../types';

interface ConceptMapProps {
  concepts: Concept[];
  onSelectConcept: (concept: Concept) => void;
  selectedConceptId?: string;
}

const ConceptMap: React.FC<ConceptMapProps> = ({ concepts, onSelectConcept, selectedConceptId }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<any>(null);

  useEffect(() => {
    if (!concepts.length || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 600;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    // Create a group for zoom/pan transformations
    const g = svg.append("g");

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3]) // Min and max zoom levels
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Prepare data
    const nodes = concepts.map(d => ({ ...d }));
    const links: any[] = [];

    concepts.forEach(c => {
      c.dependencies.forEach(depId => {
        const target = concepts.find(t => t.id === depId);
        if (target) {
          links.push({ source: target.id, target: c.id });
        }
      });
    });

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Arrow marker
    g.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#94a3b8");

    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)");

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );

    // Node Circles with gradual color progression
    node.append("circle")
      .attr("r", 20)
      .attr("fill", (d) => {
        switch (d.masteryLevel) {
          case MasteryLevel.LOCKED:
            return "#e2e8f0";
          case MasteryLevel.RECOGNITION:
            return "#fef3c7";
          case MasteryLevel.UNDERSTANDING:
            return "#fde047";
          case MasteryLevel.APPLICATION:
            return "#a3e635";
          case MasteryLevel.REASONING:
            return "#22c55e";
          default:
            return "#e2e8f0";
        }
      })
      .attr("stroke", (d) => {
        if (d.id === selectedConceptId) return "#0f172a";
        switch (d.masteryLevel) {
          case MasteryLevel.LOCKED:
            return "#94a3b8";
          case MasteryLevel.RECOGNITION:
            return "#f59e0b";
          case MasteryLevel.UNDERSTANDING:
            return "#eab308";
          case MasteryLevel.APPLICATION:
            return "#84cc16";
          case MasteryLevel.REASONING:
            return "#16a34a";
          default:
            return "#94a3b8";
        }
      })
      .attr("stroke-width", (d) => d.id === selectedConceptId ? 3 : 2)
      .attr("cursor", "pointer")
      .style("transition", "fill 0.3s ease, stroke 0.3s ease")
      .on("click", (event, d) => {
        onSelectConcept(concepts.find(c => c.id === d.id)!);
      });

    // Labels
    node.append("text")
      .text(d => d.title)
      .attr("x", 24)
      .attr("y", 5)
      .attr("class", "text-xs font-sans fill-slate-700 pointer-events-none select-none font-medium");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [concepts, selectedConceptId, onSelectConcept]);

  // Zoom control functions
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-[600px] bg-slate-50 rounded-xl border border-slate-200 shadow-inner overflow-hidden relative">
      <svg ref={svgRef} className="w-full h-full"></svg>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-slate-100 transition border border-slate-200"
          title="Zoom In"
        >
          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-slate-100 transition border border-slate-200"
          title="Zoom Out"
        >
          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={handleResetZoom}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-slate-100 transition border border-slate-200"
          title="Reset Zoom"
        >
          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-sm text-xs text-slate-600 border border-slate-200">
        <div className="font-semibold mb-2 text-slate-700">Mastery Progress</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-slate-200 border border-slate-400"></div> Not Started</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-500"></div> Recognition</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-yellow-300 border border-yellow-500"></div> Understanding</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-lime-400 border border-lime-600"></div> Application</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500 border border-green-600"></div> Mastered</div>
        <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
          💡 Scroll to zoom, drag to pan
        </div>
      </div>
    </div>
  );
};

export default ConceptMap;