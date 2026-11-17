import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { 
  useGetProject, 
  useUpdateProject, 
  useDeleteProject,
  useListDesignSystems,
  useCreateGeneration,
  useGetGeneration,
  useDeleteGeneration,
  getGetProjectQueryKey,
  getGetStatsQueryKey,
  getListProjectsQueryKey,
  DesignProfile,
  ProjectUpdate
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Settings, Save, RotateCcw, AlertTriangle, Trash2, Edit2, Check,
  Download, FileCode, CheckCircle2, ChevronRight, X, Loader2, Play
} from "lucide-react";

import { LivePreview } from "@/components/LivePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

function GenerationDetailRow({ generationId, projectId }: { generationId: number, projectId: number }) {
  const { data: gen, isLoading } = useGetGeneration(generationId);
  const queryClient = useQueryClient();
  const deleteGeneration = useDeleteGeneration({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      }
    }
  });

  if (isLoading) return <div className="p-4"><Skeleton className="h-20 w-full" /></div>;
  if (!gen) return null;

  return (
    <div className="bg-muted/30 border border-border rounded-md mt-2 p-4 text-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-4 flex-1 pr-8">
          <div>
            <h4 className="font-semibold text-foreground mb-1">Mapping Notes</h4>
            <p className="text-muted-foreground text-xs leading-relaxed">{gen.notes}</p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Files ({gen.files.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {gen.files.map((file, i) => (
                <div key={i} className="flex items-center space-x-2 bg-background border p-2 rounded text-xs overflow-hidden">
                  <FileCode className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate" title={file.path}>{file.path}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-2 shrink-0">
          <Button size="sm" asChild variant="default" className="w-full justify-start">
            <a href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/generations/${gen.id}/download?scope=package`} download>
              <Download className="h-4 w-4 mr-2" /> Download Package
            </a>
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Generation</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this generation for {gen.designSystemName}? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteGeneration.mutate({ id: gen.id })}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

export default function ProjectWorkspace() {
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id ? parseInt(params.id, 10) : 0;
  const [location, setLocation] = useRoute("/");
  
  const queryClient = useQueryClient();
  const { data: project, isLoading: isProjectLoading, isError: isProjectError } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });
  
  const { data: systems, isLoading: isSystemsLoading } = useListDesignSystems();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  
  const [profile, setProfile] = useState<DesignProfile | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<string>("");
  const [expandedGenId, setExpandedGenId] = useState<number | null>(null);

  // Initialize profile when loaded
  useEffect(() => {
    if (project && !profile) {
      setProfile(JSON.parse(JSON.stringify(project.designProfile))); // Deep copy
      setEditedName(project.name);
    }
  }, [project]);

  const updateProject = useUpdateProject({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setIsEditingName(false);
      }
    }
  });

  const deleteProject = useDeleteProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        // Can't use router properly if we just delete, need to redirect manually
        window.location.href = import.meta.env.BASE_URL;
      }
    }
  });

  const createGeneration = useCreateGeneration({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      }
    }
  });

  if (isProjectLoading) {
    return (
      <div className="w-full max-w-6xl space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isProjectError || !project) {
    return (
      <div className="w-full max-w-2xl mt-12">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Project</AlertTitle>
          <AlertDescription>
            Could not load project #{projectId}. It may have been deleted or the server is unavailable.
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => window.location.href = import.meta.env.BASE_URL}>
          Return Home
        </Button>
      </div>
    );
  }

  if (!profile) return null;

  const isProfileDirty = JSON.stringify(profile) !== JSON.stringify(project.designProfile);

  const handleSaveProfile = () => {
    updateProject.mutate({ id: projectId, data: { designProfile: profile } });
  };

  const handleResetProfile = () => {
    setProfile(JSON.parse(JSON.stringify(project.designProfile)));
  };

  const handleGenerate = () => {
    if (!selectedSystem) return;
    createGeneration.mutate({ id: projectId, data: { designSystemId: selectedSystem } });
  };

  // Color input helper
  const ColorInput = ({ label, field, value }: { label: string, field: keyof typeof profile.colors, value: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex space-x-2">
        <div className="relative h-9 w-9 rounded-md border border-input overflow-hidden shrink-0">
          <input 
            type="color" 
            value={value || '#000000'} 
            onChange={(e) => setProfile({ ...profile, colors: { ...profile.colors, [field]: e.target.value } })}
            className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" 
          />
        </div>
        <Input 
          className="h-9 font-mono text-xs uppercase" 
          value={value || ''} 
          onChange={(e) => setProfile({ ...profile, colors: { ...profile.colors, [field]: e.target.value } })}
        />
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-7xl space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-background pt-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            {isEditingName ? (
              <div className="flex items-center space-x-2">
                <Input 
                  value={editedName} 
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-64 font-display font-bold text-2xl h-10"
                  autoFocus
                />
                <Button size="icon" variant="ghost" onClick={() => updateProject.mutate({ id: projectId, data: { name: editedName } })}>
                  <Check className="h-5 w-5 text-success" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setIsEditingName(false); setEditedName(project.name); }}>
                  <X className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 group">
                <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">{project.name}</h1>
                <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setIsEditingName(true)}>
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            )}
            
            <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-wider">
              {project.sourceType}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
            <span className="font-mono bg-muted/50 px-2 py-0.5 rounded">{project.sourceRef}</span>
            <span>•</span>
            <span>Created {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}</span>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0">
              <Trash2 className="h-4 w-4 mr-2" /> Delete Project
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this project? All associated generations will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteProject.mutate({ id: projectId })} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete Project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {project.warnings && project.warnings.length > 0 && (
        <Alert variant="warning" className="border-l-4 border-l-yellow-500">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-yellow-700 font-semibold">Parser Warnings</AlertTitle>
          <AlertDescription className="text-yellow-600/90 mt-2">
            <ul className="list-disc pl-4 space-y-1">
              {project.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Editor */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <Card className="shadow-sm sticky top-20">
            <CardHeader className="pb-4 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Design Profile</CardTitle>
                  <CardDescription>Extracted tokens and logic</CardDescription>
                </div>
                {isProfileDirty && (
                  <div className="flex space-x-2">
                    <Button size="sm" variant="ghost" onClick={handleResetProfile} className="h-8 w-8 p-0" title="Reset changes">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={handleSaveProfile} className="h-8 gap-2 bg-primary">
                      <Save className="h-4 w-4" /> Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <Tabs defaultValue="colors" className="w-full">
                <TabsList className="w-full grid grid-cols-4 rounded-none border-b bg-transparent h-12">
                  <TabsTrigger value="colors" className="data-[state=active]:bg-muted/50 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Colors</TabsTrigger>
                  <TabsTrigger value="type" className="data-[state=active]:bg-muted/50 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Type</TabsTrigger>
                  <TabsTrigger value="space" className="data-[state=active]:bg-muted/50 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Space</TabsTrigger>
                  <TabsTrigger value="tone" className="data-[state=active]:bg-muted/50 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Tone</TabsTrigger>
                </TabsList>
                
                <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <TabsContent value="colors" className="m-0 space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Core</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <ColorInput label="Primary" field="primary" value={profile.colors.primary} />
                        <ColorInput label="Secondary" field="secondary" value={profile.colors.secondary || ''} />
                        <ColorInput label="Accent" field="accent" value={profile.colors.accent || ''} />
                        <ColorInput label="Border" field="border" value={profile.colors.border || ''} />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Surfaces</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <ColorInput label="Background" field="background" value={profile.colors.background} />
                        <ColorInput label="Surface" field="surface" value={profile.colors.surface || ''} />
                        <ColorInput label="Text" field="text" value={profile.colors.text} />
                        <ColorInput label="Muted Text" field="muted" value={profile.colors.muted || ''} />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Semantic</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <ColorInput label="Success" field="success" value={profile.colors.success || ''} />
                        <ColorInput label="Warning" field="warning" value={profile.colors.warning || ''} />
                        <ColorInput label="Danger" field="danger" value={profile.colors.danger || ''} />
                      </div>
                    </div>

                    {profile.colors.palette && profile.colors.palette.length > 0 && (
                      <div className="space-y-4 pt-4 border-t">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Raw Palette (Read-only)</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.colors.palette.map((p, i) => (
                            <TooltipProvider key={i}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div 
                                    className="h-8 w-8 rounded-full border shadow-sm cursor-help" 
                                    style={{ backgroundColor: p.hex }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    <div className="font-bold">{p.name}</div>
                                    <div className="font-mono">{p.hex}</div>
                                    {p.role && <div className="text-muted-foreground">{p.role}</div>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="type" className="m-0 space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Font Families</h4>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label>Heading Font</Label>
                          <Input value={profile.typography.headingFont} onChange={(e) => setProfile({...profile, typography: {...profile.typography, headingFont: e.target.value}})} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Body Font</Label>
                          <Input value={profile.typography.bodyFont} onChange={(e) => setProfile({...profile, typography: {...profile.typography, bodyFont: e.target.value}})} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Monospace Font</Label>
                          <Input value={profile.typography.monoFont || ''} onChange={(e) => setProfile({...profile, typography: {...profile.typography, monoFont: e.target.value}})} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Scale & Weights</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Base Size (px)</Label>
                          <Input type="number" value={profile.typography.baseSizePx || 16} onChange={(e) => setProfile({...profile, typography: {...profile.typography, baseSizePx: parseInt(e.target.value)}})} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Scale Ratio</Label>
                          <Input type="number" step="0.1" value={profile.typography.scaleRatio || 1.2} onChange={(e) => setProfile({...profile, typography: {...profile.typography, scaleRatio: parseFloat(e.target.value)}})} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Heading Weight</Label>
                          <Input type="number" step="100" value={profile.typography.headingWeight || 700} onChange={(e) => setProfile({...profile, typography: {...profile.typography, headingWeight: parseInt(e.target.value)}})} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Body Weight</Label>
                          <Input type="number" step="100" value={profile.typography.bodyWeight || 400} onChange={(e) => setProfile({...profile, typography: {...profile.typography, bodyWeight: parseInt(e.target.value)}})} />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="space" className="m-0 space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Spacing System</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Base Grid (px)</Label>
                          <Input type="number" value={profile.spacing.basePx} onChange={(e) => setProfile({...profile, spacing: {...profile.spacing, basePx: parseInt(e.target.value)}})} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Density</Label>
                          <Select 
                            value={profile.spacing.density} 
                            onValueChange={(val: any) => setProfile({...profile, spacing: {...profile.spacing, density: val}})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="compact">Compact</SelectItem>
                              <SelectItem value="comfortable">Comfortable</SelectItem>
                              <SelectItem value="spacious">Spacious</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Corner Radius</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Base Radius (px)</Label>
                          <Input type="number" value={profile.radius.basePx} onChange={(e) => setProfile({...profile, radius: {...profile.radius, basePx: parseInt(e.target.value)}})} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Style</Label>
                          <Select 
                            value={profile.radius.style} 
                            onValueChange={(val: any) => setProfile({...profile, radius: {...profile.radius, style: val}})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sharp">Sharp</SelectItem>
                              <SelectItem value="subtle">Subtle</SelectItem>
                              <SelectItem value="rounded">Rounded</SelectItem>
                              <SelectItem value="pill">Pill</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">Elevation & Depth</h4>
                      <div className="space-y-1.5">
                        <Label>Shadow Style</Label>
                        <Select 
                          value={profile.shadows.style} 
                          onValueChange={(val: any) => setProfile({...profile, shadows: {...profile.shadows, style: val}})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None (Flat)</SelectItem>
                            <SelectItem value="subtle">Subtle</SelectItem>
                            <SelectItem value="elevated">Elevated</SelectItem>
                            <SelectItem value="dramatic">Dramatic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="tone" className="m-0 space-y-6">
                    <div className="space-y-1.5">
                      <Label>Summary</Label>
                      <Textarea 
                        value={profile.tone.summary} 
                        onChange={(e) => setProfile({...profile, tone: {...profile.tone, summary: e.target.value}})}
                        className="min-h-[100px]"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label>Descriptors</Label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {profile.tone.descriptors.map((desc, i) => (
                          <Badge key={i} variant="secondary" className="px-3 py-1 text-sm font-medium">
                            {desc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column: Preview & Generate */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          
          {/* Live Preview Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-semibold">Live Preview</h2>
              {isProfileDirty && <span className="text-xs text-muted-foreground italic tracking-wide">Showing unsaved changes</span>}
            </div>
            <LivePreview profile={profile} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
            {/* Generate Package */}
            <Card className="border-2 shadow-md">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="font-display flex items-center">
                  <Play className="w-5 h-5 mr-2 text-primary fill-primary" />
                  Generate Output
                </CardTitle>
                <CardDescription>Target a specific design system format</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {isSystemsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Target Design System</Label>
                    <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                      <SelectTrigger className="h-14 text-base shadow-sm">
                        <SelectValue placeholder="Select a system..." />
                      </SelectTrigger>
                      <SelectContent>
                        {systems?.map(sys => (
                          <SelectItem key={sys.id} value={sys.id} className="py-3">
                            <div className="flex items-center">
                              <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: sys.brandColor }}></div>
                              <div className="text-left">
                                <div className="font-semibold">{sys.name}</div>
                                <div className="text-xs text-muted-foreground">{sys.organization}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {selectedSystem && systems && (
                  <div className="bg-muted/30 p-4 rounded-lg text-sm space-y-2 border">
                    {(() => {
                      const sys = systems.find(s => s.id === selectedSystem);
                      if (!sys) return null;
                      return (
                        <>
                          <p className="text-muted-foreground">{sys.description}</p>
                          <div className="pt-2 flex flex-wrap gap-2">
                            {sys.outputFormats.map(fmt => (
                              <Badge key={fmt} variant="outline" className="bg-background/50 font-mono text-[10px]">.{fmt}</Badge>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                
                <Button 
                  className="w-full h-12 text-base font-semibold shadow-md" 
                  size="lg"
                  disabled={!selectedSystem || createGeneration.isPending || isProfileDirty}
                  onClick={handleGenerate}
                  data-testid="button-generate"
                >
                  {createGeneration.isPending ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...</>
                  ) : isProfileDirty ? (
                    "Save profile before generating"
                  ) : (
                    "Build Package"
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generations List */}
            <div className="space-y-4">
              <h3 className="text-lg font-display font-semibold border-b pb-2">History ({project.generations.length})</h3>
              
              {project.generations.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 border border-dashed rounded-lg text-muted-foreground text-sm">
                  No packages generated yet. Select a target system to the left to begin.
                </div>
              ) : (
                <div className="space-y-3">
                  {[...project.generations].reverse().map(gen => (
                    <div key={gen.id} className="border rounded-lg overflow-hidden bg-card shadow-sm transition-all hover:border-primary/30">
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20"
                        onClick={() => setExpandedGenId(expandedGenId === gen.id ? null : gen.id)}
                      >
                        <div>
                          <div className="font-semibold text-foreground flex items-center">
                            {gen.designSystemName}
                            <Badge variant="secondary" className="ml-2 font-mono text-[10px] bg-primary/10 text-primary">{gen.fileCount} files</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(gen.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          {project.sourceType === 'repo' && (
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-primary bg-primary/5 hover:bg-primary/10" asChild onClick={e => e.stopPropagation()}>
                              <a href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/generations/${gen.id}/download?scope=codebase`} download>
                                <Download className="h-3 w-3 mr-1.5" /> Codebase
                              </a>
                            </Button>
                          )}
                          <div className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted">
                            <ChevronRight className={`h-5 w-5 transition-transform ${expandedGenId === gen.id ? 'rotate-90' : ''}`} />
                          </div>
                        </div>
                      </div>
                      
                      {expandedGenId === gen.id && (
                        <div className="px-4 pb-4 bg-muted/10 border-t">
                          <GenerationDetailRow generationId={gen.id} projectId={project.id} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
