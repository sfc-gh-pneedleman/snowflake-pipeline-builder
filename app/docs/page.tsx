"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Database,
  Code,
  RefreshCw,
  Clock,
  Radio,
  FolderOpen,
  FileSpreadsheet,
  Table2,
  Download,
  MousePointer,
  Move,
  Link as LinkIcon,
  Settings,
  Play,
  Save,
  HelpCircle,
  Zap,
  ArrowRight,
  CheckCircle2,
  Calendar,
  GitBranch,
  Rocket,
  ChevronUp,
  ChevronDown,
  Home,
  Trash2,
  Snowflake,
} from "lucide-react";

const sections = [
  { id: "quick-start", label: "Quick Start", icon: Zap },
  { id: "home-page", label: "Home Page", icon: Home },
  { id: "canvas-interactions", label: "Canvas Interactions", icon: MousePointer },
  { id: "pipeline-components", label: "Pipeline Components", icon: Database },
  { id: "connections", label: "Connections", icon: LinkIcon },
  { id: "saving-loading", label: "Saving & Loading", icon: Save },
  { id: "snowflake-connection", label: "Snowflake Connection", icon: Snowflake },
  { id: "scheduler", label: "Scheduler", icon: Calendar },
  { id: "deploying", label: "Deploying", icon: Rocket },
  { id: "faq", label: "FAQ", icon: HelpCircle },
  { id: "example-workflow", label: "Example Workflow", icon: ArrowRight },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("quick-start");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [openComponents, setOpenComponents] = useState<string[]>(["sources"]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = document.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        setShowBackToTop(scrollContainer.scrollTop > 300);

        for (const section of sections) {
          const el = document.getElementById(section.id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 150 && rect.bottom > 150) {
              setActiveSection(section.id);
              break;
            }
          }
        }
      }
    };

    const scrollContainer = document.querySelector("[data-radix-scroll-area-viewport]");
    scrollContainer?.addEventListener("scroll", handleScroll);
    return () => scrollContainer?.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToTop = () => {
    const scrollContainer = document.querySelector("[data-radix-scroll-area-viewport]");
    scrollContainer?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleComponent = (id: string) => {
    setOpenComponents(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 bg-slate-950 z-50">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <span className="text-slate-500">|</span>
          <div className="flex items-center gap-2 text-cyan-400">
            <img src="/logo.svg" alt="Data Pipeline Builder" className="w-7 h-7" />
            <span className="font-bold text-lg">Data Pipeline Builder</span>
          </div>
          <span className="text-slate-500">|</span>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <span className="text-slate-300 font-medium">Documentation</span>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex-shrink-0">
          <div className="p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contents</h2>
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      activeSection === section.id
                        ? "bg-cyan-500/20 text-cyan-400 font-medium"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </div>
          <Separator className="bg-slate-800" />
          <div className="p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Resources</h2>
            <nav className="space-y-1">
              <a
                href="https://docs.snowflake.com/en/user-guide/data-pipelines-intro"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                Snowflake Pipelines
              </a>
              <a
                href="https://docs.snowflake.com/en/user-guide/tasks-intro"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                Snowflake Tasks
              </a>
              <a
                href="https://docs.snowflake.com/en/user-guide/dynamic-tables-intro"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                Dynamic Tables
              </a>
            </nav>
          </div>
        </aside>

        <main className="flex-1 relative">
          <ScrollArea id="docs-content" className="h-full">
            <div className="max-w-3xl mx-auto py-8 px-8 space-y-10">
              <section>
                <h1 className="text-3xl font-bold text-slate-100 mb-3">Data Pipeline Builder</h1>
                <p className="text-slate-400 text-lg leading-relaxed">
                  A visual drag-and-drop tool for building Snowflake data pipelines. Create ETL workflows,
                  configure data transformations, and generate production-ready SQL.
                </p>
              </section>

              <section id="quick-start" className="scroll-mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Zap className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100">Quick Start</h2>
                </div>
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardContent className="p-5">
                    <ol className="space-y-4 text-slate-300">
                      <li className="flex items-start gap-4">
                        <div className="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                        <div>
                          <strong className="text-slate-100">Start from the Home page</strong>
                          <p className="text-sm text-slate-400 mt-1">Click "New Pipeline" to create a blank pipeline or "Open Pipeline" to load a saved one.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-4">
                        <div className="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                        <div>
                          <strong className="text-slate-100">Connect to Snowflake</strong>
                          <p className="text-sm text-slate-400 mt-1">Click the Snowflake button in the header to enter your credentials and enable browsing tables.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-4">
                        <div className="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                        <div>
                          <strong className="text-slate-100">Drag components onto the canvas</strong>
                          <p className="text-sm text-slate-400 mt-1">Use the Components panel to add Source Tables, Transforms, Stages, and more.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-4">
                        <div className="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
                        <div>
                          <strong className="text-slate-100">Connect and configure nodes</strong>
                          <p className="text-sm text-slate-400 mt-1">Drag from output handles to input handles to create data flows. Click nodes to configure.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-4">
                        <div className="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">5</div>
                        <div>
                          <strong className="text-slate-100">Save and deploy</strong>
                          <p className="text-sm text-slate-400 mt-1">Save your pipeline, review the generated SQL, and deploy to Snowflake.</p>
                        </div>
                      </li>
                    </ol>
                  </CardContent>
                </Card>
              </section>

              <section id="home-page" className="scroll-mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Home className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100">Home Page</h2>
                </div>
                <p className="text-slate-400 mb-4">
                  The Home page is your central hub for accessing all features of the Pipeline Builder.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-slate-100 mb-2">Pipeline Builder</h4>
                      <ul className="space-y-2 text-sm text-slate-400">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                          <span><strong>New Pipeline</strong> — Start with a blank canvas</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-purple-400" />
                          <span><strong>Open Pipeline</strong> — Load a saved pipeline</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-slate-100 mb-2">Scheduler</h4>
                      <ul className="space-y-2 text-sm text-slate-400">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span><strong>New Schedule</strong> — Create a new task schedule</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-amber-400" />
                          <span><strong>Open Schedule</strong> — Load a saved schedule</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                <Card className="bg-slate-900/50 border-slate-700 mt-3">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-slate-100 mb-2">Recent Items</h4>
                    <p className="text-sm text-slate-400">
                      The Home page shows your most recently modified pipelines and schedules for quick access.
                      Click any item to open it directly.
                    </p>
                  </CardContent>
                </Card>
              </section>

              <section id="canvas-interactions" className="scroll-mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <MousePointer className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100">Canvas Interactions</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Move className="w-4 h-4 text-emerald-400" />
                        <h4 className="font-semibold text-slate-100">Moving Nodes</h4>
                      </div>
                      <p className="text-sm text-slate-400">Click and drag nodes to reposition them on the canvas.</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <LinkIcon className="w-4 h-4 text-emerald-400" />
                        <h4 className="font-semibold text-slate-100">Creating Connections</h4>
                      </div>
                      <p className="text-sm text-slate-400">Drag from output handle (bottom) to input handle (top).</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-emerald-400" />
                        <h4 className="font-semibold text-slate-100">Selecting Items</h4>
                      </div>
                      <p className="text-sm text-slate-400">Click a node or connection to select and view configuration.</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Play className="w-4 h-4 text-emerald-400" />
                        <h4 className="font-semibold text-slate-100">Zoom & Pan</h4>
                      </div>
                      <p className="text-sm text-slate-400">Scroll to zoom, drag empty space to pan.</p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section id="pipeline-components" className="scroll-mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Database className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100">Pipeline Components</h2>
                </div>
                <div className="space-y-3">
                  <Collapsible open={openComponents.includes("sources")} onOpenChange={() => toggleComponent("sources")}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-lg hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-cyan-400 border-cyan-700">Sources</Badge>
                          <span className="text-sm text-slate-400">Source Table, Stage, File Format</span>
                        </div>
                        {openComponents.includes("sources") ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      <Card className="bg-slate-900/30 border-slate-700/50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Database className="w-5 h-5 text-cyan-400 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-slate-100">Source Table</h4>
                              <p className="text-sm text-slate-400 mt-1">Reference an existing Snowflake table. Browse databases and schemas to select your source data.</p>
                              <p className="text-xs text-slate-500 mt-2"><strong>Config:</strong> Database, Schema, Table, Alias</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-900/30 border-slate-700/50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <FolderOpen className="w-5 h-5 text-yellow-400 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-slate-100">Stage</h4>
                              <p className="text-sm text-slate-400 mt-1">Configure internal or external stages for file-based loading. Supports S3, GCS, Azure.</p>
                              <p className="text-xs text-slate-500 mt-2"><strong>Config:</strong> Mode (Create/Existing), Database, Schema, Name, Type, URL, Storage Integration</p>
                              <p className="text-xs text-slate-500 mt-1"><strong>Tip:</strong> Select "Use Existing" to browse and select stages already in your Snowflake account.</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-900/30 border-slate-700/50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <FileSpreadsheet className="w-5 h-5 text-pink-400 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-slate-100">File Format</h4>
                              <p className="text-sm text-slate-400 mt-1">Define formats for CSV, JSON, Parquet, Avro, ORC, or XML files.</p>
                              <p className="text-xs text-slate-500 mt-2"><strong>Config:</strong> Format Type, Delimiters, Compression</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible open={openComponents.includes("loading")} onOpenChange={() => toggleComponent("loading")}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-lg hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-emerald-400 border-emerald-700">Data Loading</Badge>
                          <span className="text-sm text-slate-400">Copy Into</span>
                        </div>
                        {openComponents.includes("loading") ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <Card className="bg-slate-900/30 border-slate-700/50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Download className="w-5 h-5 text-indigo-400 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-slate-100">Copy Into</h4>
                              <p className="text-sm text-slate-400 mt-1">Load data from a stage into a target table. Connect Stage and File Format for auto-configuration.</p>
                              <p className="text-xs text-slate-500 mt-2"><strong>Config:</strong> Stage, Target Table, File Pattern, Validation Mode</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible open={openComponents.includes("transforms")} onOpenChange={() => toggleComponent("transforms")}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-lg hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-purple-400 border-purple-700">Transforms</Badge>
                          <span className="text-sm text-slate-400">SQL Transform, Dynamic Table</span>
                        </div>
                        {openComponents.includes("transforms") ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      <Card className="bg-slate-900/30 border-slate-700/50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Code className="w-5 h-5 text-blue-400 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-slate-100">SQL Transform</h4>
                              <p className="text-sm text-slate-400 mt-1">Write custom SQL queries. Auto-generates SELECT statements and suggests JOINs.</p>
                              <p className="text-xs text-slate-500 mt-2"><strong>Config:</strong> Output Name, Output Type, SQL Query</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-900/30 border-slate-700/50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <RefreshCw className="w-5 h-5 text-green-400 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-slate-100">Dynamic Table</h4>
                              <p className="text-sm text-slate-400 mt-1">Create auto-refreshing tables with configurable target lag for streaming pipelines.</p>
                              <p className="text-xs text-slate-500 mt-2"><strong>Config:</strong> Table Name, Target Lag, Warehouse, SQL</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible open={openComponents.includes("cdc")} onOpenChange={() => toggleComponent("cdc")}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-lg hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-orange-400 border-orange-700">Change Data Capture</Badge>
                          <span className="text-sm text-slate-400">Stream, Task</span>
                        </div>
                        {openComponents.includes("cdc") ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      <Card className="bg-slate-900/30 border-slate-700/50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Radio className="w-5 h-5 text-orange-400 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-slate-100">Stream</h4>
                              <p className="text-sm text-slate-400 mt-1">Capture changes (inserts, updates, deletes) to a source table for incremental processing.</p>
                              <p className="text-xs text-slate-500 mt-2"><strong>Config:</strong> Stream Name, Source Table, Append-Only Mode</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-900/30 border-slate-700/50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-amber-400 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-slate-100">Task</h4>
                              <p className="text-sm text-slate-400 mt-1">Schedule SQL execution on a recurring basis or when a stream has new data.</p>
                              <p className="text-xs text-slate-500 mt-2"><strong>Config:</strong> Task Name, Warehouse, Schedule, Stream Trigger</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible open={openComponents.includes("targets")} onOpenChange={() => toggleComponent("targets")}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-lg hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-red-400 border-red-700">Targets</Badge>
                          <span className="text-sm text-slate-400">Target Table</span>
                        </div>
                        {openComponents.includes("targets") ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <Card className="bg-slate-900/30 border-slate-700/50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Table2 className="w-5 h-5 text-red-400 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-slate-100">Target Table</h4>
                              <p className="text-sm text-slate-400 mt-1">Define the output destination for your pipeline. Create new or reference existing tables.</p>
                              <p className="text-xs text-slate-500 mt-2"><strong>Config:</strong> Table Name, Database/Schema, Columns</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </section>

              <section id="connections" className="scroll-mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <LinkIcon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100">Connections</h2>
                </div>
                <p className="text-slate-400 mb-4">
                  Connections (edges) define the data flow between nodes. You can select, modify, and delete connections.
                </p>
                <div className="space-y-3">
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-slate-100 mb-2">Selecting Connections</h4>
                      <p className="text-sm text-slate-400">
                        Click on any connection line to select it. Selected connections are highlighted in cyan and show an animation.
                        The configuration panel will show connection details.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-slate-100 mb-2">Modifying Connections</h4>
                      <p className="text-sm text-slate-400">
                        When a connection is selected, you can change its source or target node using the dropdowns in the configuration panel.
                        Click "Update" to apply changes.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-slate-100 mb-2">Deleting Connections</h4>
                      <p className="text-sm text-slate-400">
                        Select a connection and click the delete button (trash icon) in the configuration panel to remove it.
                        This works the same in both the Pipeline Builder and Scheduler.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section id="saving-loading" className="scroll-mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Save className="w-5 h-5 text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100">Saving & Loading</h2>
                </div>
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <h4 className="font-semibold text-slate-100 mb-2">Pipelines</h4>
                      <ul className="space-y-2 text-sm text-slate-400">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span><strong>Save</strong> — Save pipeline to browser storage with a custom name</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span><strong>Load</strong> — Restore a previously saved pipeline</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span><strong>Export JSON</strong> — Download pipeline as a JSON file for sharing or version control</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span><strong>Import JSON</strong> — Load a pipeline from a JSON file</span>
                        </li>
                      </ul>
                    </div>
                    <Separator className="bg-slate-700" />
                    <div>
                      <h4 className="font-semibold text-slate-100 mb-2">Schedules</h4>
                      <ul className="space-y-2 text-sm text-slate-400">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span><strong>Save</strong> — Save schedule configuration including task positions and dependencies</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span><strong>Load</strong> — Restore a saved schedule configuration</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span><strong>Export JSON</strong> — Download schedule as a JSON file for sharing or backup</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span><strong>Import JSON</strong> — Load a schedule from a JSON file</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span><strong>New</strong> — Clear the canvas and start a fresh schedule</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section id="snowflake-connection" className="scroll-mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Snowflake className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100">Snowflake Connection</h2>
                </div>
                <p className="text-slate-400 mb-4">
                  Connecting to Snowflake enables browsing tables, previewing data, and deploying SQL.
                </p>
                <div className="space-y-3">
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-slate-100 mb-2">Authentication Methods</h4>
                      <ul className="space-y-2 text-sm text-slate-400">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5" />
                          <span><strong>Password</strong> — Enter username and password directly</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5" />
                          <span><strong>SSO Browser</strong> — Opens browser for single sign-on authentication</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-slate-100 mb-2">Connection Status</h4>
                      <p className="text-sm text-slate-400 mb-2">
                        The connection status is shown in the header of both the Pipeline Builder and Scheduler:
                      </p>
                      <ul className="space-y-2 text-sm text-slate-400">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span><strong>Connected</strong> — Shows account name, enables browsing and deployment</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-slate-500" />
                          </div>
                          <span><strong>Not Connected</strong> — Click to enter credentials</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-slate-100 mb-2">What Connection Enables</h4>
                      <ul className="space-y-2 text-sm text-slate-400">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Browse databases, schemas, and tables</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Browse existing stages</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Preview data from tables</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Deploy generated SQL to Snowflake</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Deploy scheduled tasks</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section id="scheduler" className="scroll-mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100">Scheduler</h2>
                </div>
                <p className="text-slate-400 mb-4">
                  Automate pipelines by creating Snowflake Tasks that run on a schedule or in response to data changes.
                </p>

                <div className="space-y-4">
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">How to Schedule a Pipeline</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <ol className="space-y-2 text-sm text-slate-300">
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-400 font-bold">1.</span>
                          <span>Go to <strong>Home → New Schedule</strong> or <strong>Open Schedule</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-400 font-bold">2.</span>
                          <span>Drag saved pipelines from the library onto the canvas</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-400 font-bold">3.</span>
                          <span>Configure schedule type (cron or interval), timezone, and warehouse</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-400 font-bold">4.</span>
                          <span>Connect pipelines to create dependencies (optional)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-400 font-bold">5.</span>
                          <span>Toggle "Start Active" if you want the task to run immediately after deploy</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-400 font-bold">6.</span>
                          <span>Click "Deploy Tasks" to create the tasks in Snowflake</span>
                        </li>
                      </ol>
                    </CardContent>
                  </Card>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Card className="bg-slate-900/50 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <h4 className="font-semibold text-slate-100">Cron Schedule</h4>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">Precise scheduling with cron expressions:</p>
                        <div className="space-y-1 text-xs font-mono">
                          <div><code className="bg-slate-800 px-1.5 py-0.5 rounded">0 0 * * *</code> <span className="text-slate-500 ml-2">Daily midnight</span></div>
                          <div><code className="bg-slate-800 px-1.5 py-0.5 rounded">0 */6 * * *</code> <span className="text-slate-500 ml-2">Every 6 hours</span></div>
                          <div><code className="bg-slate-800 px-1.5 py-0.5 rounded">0 9 * * MON</code> <span className="text-slate-500 ml-2">Mondays 9 AM</span></div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <RefreshCw className="w-4 h-4 text-green-400" />
                          <h4 className="font-semibold text-slate-100">Interval Schedule</h4>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">Run at fixed intervals:</p>
                        <div className="space-y-1 text-xs font-mono">
                          <div><code className="bg-slate-800 px-1.5 py-0.5 rounded">1 MINUTE</code></div>
                          <div><code className="bg-slate-800 px-1.5 py-0.5 rounded">15 MINUTES</code></div>
                          <div><code className="bg-slate-800 px-1.5 py-0.5 rounded">1 HOUR</code></div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <GitBranch className="w-4 h-4 text-cyan-400" />
                        <h4 className="font-semibold text-slate-100">Task Dependencies</h4>
                      </div>
                      <p className="text-sm text-slate-400 mb-3">
                        Create task chains by connecting pipelines. Child tasks run only after parent completes.
                      </p>
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="px-2 py-1 bg-slate-800 rounded">Parent Pipeline</span>
                        <ArrowRight className="w-3 h-3 text-cyan-400" />
                        <span className="px-2 py-1 bg-slate-800 rounded">Child Pipeline</span>
                        <ArrowRight className="w-3 h-3 text-cyan-400" />
                        <span className="px-2 py-1 bg-slate-800 rounded">Grandchild Pipeline</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-3 italic">
                        Tip: Only the root task needs a schedule. Children inherit from parent completion.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-amber-950/30 border-amber-800/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Play className="w-4 h-4 text-amber-400" />
                        <h4 className="font-semibold text-slate-100">Start Active Toggle</h4>
                      </div>
                      <p className="text-sm text-slate-400">
                        The "Start Active" toggle controls the <strong>initial state</strong> of the task when deployed to Snowflake:
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-400">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span><strong>On</strong> — Task starts running on schedule immediately after deploy</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-slate-500" />
                          <span><strong>Off</strong> — Task is created in SUSPENDED state, must be resumed in Snowflake</span>
                        </li>
                      </ul>
                      <p className="text-xs text-amber-400/80 mt-3">
                        Note: This does not control running tasks. Use Snowflake to suspend/resume deployed tasks.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Settings className="w-4 h-4 text-slate-400" />
                        <h4 className="font-semibold text-slate-100">Configuration Options</h4>
                      </div>
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-slate-300"><strong>Warehouse</strong> — Compute for task execution</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-slate-300"><strong>Timezone</strong> — For schedule interpretation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-slate-300"><strong>Allow Overlapping</strong> — Prevent concurrent runs</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-slate-300"><strong>Suspend After Failures</strong> — Auto-suspend after N failures</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-slate-300"><strong>Timeout</strong> — Maximum runtime before timeout</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section id="deploying" className="scroll-mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Rocket className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100">Deploying</h2>
                </div>
                <p className="text-slate-400 mb-4">
                  Deploy your pipelines and schedules directly to Snowflake from the application.
                </p>
                <div className="space-y-3">
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-slate-100 mb-2">Pipeline Builder Deployment</h4>
                      <p className="text-sm text-slate-400 mb-2">
                        Click "Deploy" to execute the generated SQL in Snowflake. This creates tables, views, stages, and other objects.
                      </p>
                      <p className="text-xs text-slate-500">
                        Requires active Snowflake connection.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-slate-100 mb-2">Scheduler Deployment</h4>
                      <p className="text-sm text-slate-400 mb-2">
                        Click "Deploy Tasks" to create Snowflake Tasks for your scheduled pipelines. This:
                      </p>
                      <ul className="space-y-1 text-sm text-slate-400 mt-2">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Creates stored procedures for each pipeline</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Creates tasks with configured schedules</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Sets up task dependencies</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Starts or suspends tasks based on "Start Active" setting</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-slate-100 mb-2">Generate SQL</h4>
                      <p className="text-sm text-slate-400">
                        Click "Generate SQL" to preview the SQL that will be executed. You can copy or download the SQL
                        to run manually or review before deploying.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section id="faq" className="scroll-mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <HelpCircle className="w-5 h-5 text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100">FAQ</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { q: "How do I connect multiple tables for a JOIN?", a: "Drag multiple Source Tables and connect each to the same SQL Transform. The builder auto-suggests JOIN conditions." },
                    { q: "Can I preview data before deploying?", a: "Yes! Click \"Preview Data\" in the configuration panel to run a LIMIT 10 query. Requires Snowflake connection." },
                    { q: "What's the difference between Dynamic Tables and SQL Transforms?", a: "SQL Transforms create static views/tables. Dynamic Tables auto-refresh based on target lag." },
                    { q: "How do I use an existing stage instead of creating one?", a: "In the Stage component, select \"Use Existing\" mode, then choose your database, schema, and select from available stages." },
                    { q: "How do I delete a connection between nodes?", a: "Click on the connection line to select it, then click the delete button in the configuration panel." },
                    { q: "How do I schedule a pipeline?", a: "Go to Home → New Schedule, drag your saved pipeline onto the canvas, configure the schedule, and click Deploy Tasks." },
                    { q: "Can I save multiple schedule configurations?", a: "Yes! Click Save in the Scheduler to save your configuration. Use Load to switch between saved schedules." },
                    { q: "What does the 'Start Active' toggle do?", a: "It controls whether the task starts running immediately after deploy (Active) or is created in a suspended state." },
                    { q: "Can I create task dependencies?", a: "Yes! In Scheduler, connect pipelines together. Child tasks run after parent completes." },
                    { q: "What cron expression should I use?", a: "Format: minute hour day-of-month month day-of-week. Example: 0 9 * * MON-FRI for weekdays at 9 AM." },
                    { q: "Why is the Deploy button disabled?", a: "You need to connect to Snowflake first. Click the Snowflake button in the header to enter your credentials." },
                    { q: "Where can I see generated SQL?", a: "The Code Preview panel on the right shows all generated SQL statements. Click Generate SQL in Scheduler for task SQL." },
                    { q: "Why isn't my scheduled task running?", a: "Check: (1) Task may be SUSPENDED, (2) Warehouse suspended, (3) Stream trigger not met, (4) Parent task incomplete." },
                    { q: "How do I manage deployed tasks?", a: "Use Snowflake's UI or SQL commands (ALTER TASK...RESUME/SUSPEND) to manage tasks after deployment." },
                  ].map((item, i) => (
                    <Card key={i} className="bg-slate-900/50 border-slate-700">
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-slate-100 text-sm mb-1">{item.q}</h4>
                        <p className="text-sm text-slate-400">{item.a}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              <section id="example-workflow" className="scroll-mt-6 pb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-pink-500/20">
                    <ArrowRight className="w-5 h-5 text-pink-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100">Example Workflow</h2>
                </div>
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-slate-100 mb-3">Building a Pipeline</h4>
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded">
                        <Database className="w-4 h-4 text-cyan-400" />
                        <span>Source</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded">
                        <Code className="w-4 h-4 text-blue-400" />
                        <span>Transform</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded">
                        <RefreshCw className="w-4 h-4 text-green-400" />
                        <span>Dynamic Table</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded">
                        <Table2 className="w-4 h-4 text-red-400" />
                        <span>Target</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 mt-4">
                      Read from source → apply transformations → auto-refresh with Dynamic Table → output to target for BI tools.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-700 mt-3">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-slate-100 mb-3">Scheduling Pipelines</h4>
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-900/50 rounded border border-emerald-700">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        <span>Load Pipeline</span>
                        <Badge variant="outline" className="text-xs border-emerald-600">Daily 6 AM</Badge>
                      </div>
                      <ArrowRight className="w-4 h-4 text-cyan-400" />
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-900/50 rounded border border-emerald-700">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        <span>Transform Pipeline</span>
                        <Badge variant="outline" className="text-xs border-cyan-600">After parent</Badge>
                      </div>
                      <ArrowRight className="w-4 h-4 text-cyan-400" />
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-900/50 rounded border border-emerald-700">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        <span>Report Pipeline</span>
                        <Badge variant="outline" className="text-xs border-cyan-600">After parent</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 mt-4">
                      Chain pipelines together. Load runs at 6 AM, Transform runs after Load completes, Report runs after Transform.
                    </p>
                  </CardContent>
                </Card>
              </section>
            </div>
          </ScrollArea>

          {showBackToTop && (
            <Button
              onClick={scrollToTop}
              size="sm"
              className="fixed bottom-6 right-6 bg-cyan-600 hover:bg-cyan-700 shadow-lg z-50"
            >
              <ChevronUp className="w-4 h-4 mr-1" />
              Back to Top
            </Button>
          )}
        </main>
      </div>
    </div>
  );
}
