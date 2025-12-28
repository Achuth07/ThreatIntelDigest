
import { useQuery } from "@tanstack/react-query";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Globe, AlertTriangle } from "lucide-react";
import { scaleLinear } from "d3-scale";

// GeoJSON for the world map
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface MapPoint {
    name: string;
    coordinates: [number, number]; // [lon, lat]
    type: string;
    country: string;
}

export function GlobalThreatMap() {
    const { data: points, isLoading, error } = useQuery<MapPoint[]>({
        queryKey: ['/api/map-data'],
        refetchInterval: 1000 * 60 * 60, // Refresh every hour
        staleTime: 1000 * 60 * 30, // 30 mins
    });

    if (isLoading) {
        return (
            <Card className="bg-slate-800 border-slate-700 backdrop-blur-sm shadow-xl h-[500px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </Card>
        );
    }

    return (
        <Card className="bg-slate-800 border-slate-700 backdrop-blur-sm shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-700/50 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-emerald-500" />
                            <CardTitle className="text-slate-100">Global Threat Map</CardTitle>
                        </div>
                        <CardDescription className="text-slate-400 mt-1">
                            Live Botnet C2 servers (Top 500).
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            Active C2
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 relative h-[500px] bg-slate-900">
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{
                        scale: 120,
                    }}
                    style={{ width: "100%", height: "100%" }}
                >
                    <ZoomableGroup center={[0, 20]} zoom={1} minZoom={0.7} maxZoom={4}>
                        <Geographies geography={geoUrl}>
                            {({ geographies }) =>
                                geographies.map((geo) => (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill="#1e293b"
                                        stroke="#334155"
                                        strokeWidth={0.5}
                                        style={{
                                            default: { outline: "none" },
                                            hover: { fill: "#334155", outline: "none" },
                                            pressed: { outline: "none" },
                                        }}
                                    />
                                ))
                            }
                        </Geographies>
                        {points?.map((point, index) => (
                            <Marker key={index} coordinates={point.coordinates}>
                                <circle r={4} fill="#ef4444" fillOpacity={0.6} stroke="#fff" strokeWidth={0.5} />
                                <circle r={2} fill="#ef4444" />
                                <title>{`${point.name} (${point.country})`}</title>
                            </Marker>
                        ))}
                    </ZoomableGroup>
                </ComposableMap>
                {!points?.length && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm pointer-events-none">
                        <div className="flex flex-col items-center text-slate-400 p-4 border border-slate-700 bg-slate-800 rounded-lg">
                            <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
                            <p>Map data unavailable. Run generation script.</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
