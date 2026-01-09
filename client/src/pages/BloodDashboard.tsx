import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
    Dna,
    Activity,
    Brain,
    Heart,
    Zap,
    Pill,
    Clock,
    ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import { BloodRadar } from "@/components/blood/BloodRadar";
import { BiomarkerCard } from "@/components/blood/BiomarkerCard";
import { SCIENCE_DATA, PROTOCOLS } from "@/data/blood-analysis-data";

export default function BloodDashboard() {
    const [activeTab, setActiveTab] = useState("overview");

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />

            <main className="mx-auto max-w-7xl px-4 py-8 sm:py-12">

                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                        <div>
                            <Badge variant="outline" className="mb-2 border-primary/50 text-primary">Beta Intelligence V2.0</Badge>
                            <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                                <Dna className="h-10 w-10 text-primary" />
                                Biological Command Center
                            </h1>
                            <p className="mt-2 text-lg text-muted-foreground max-w-2xl">
                                Analyse système de vos biomarqueurs, corrélations métaboliques et protocoles d'optimisation basés sur la science.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Link href="/blood-analysis">
                                <Button size="lg" className="shadow-lg shadow-primary/20">
                                    Nouvelle Analyse
                                </Button>
                            </Link>
                        </div>
                    </div>
                </motion.div>

                {/* Hero Section: Radar + Priorities */}
                <div className="grid lg:grid-cols-3 gap-8 mb-16">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-1"
                    >
                        <Card className="h-full bg-gradient-to-b from-muted/50 to-background border-primary/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-primary" />
                                    Systèmes Biologiques
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BloodRadar />
                                <div className="text-center mt-4">
                                    <span className="text-4xl font-bold">72</span>
                                    <span className="text-muted-foreground ml-2">/ 100</span>
                                    <p className="text-sm text-muted-foreground mt-1">Score Santé Global</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <div className="lg:col-span-2 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Zap className="h-5 w-5 text-amber-500" />
                                Priorités d'Intervention
                            </h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Only showing suboptimal/critical metrics here */}
                                {Object.values(SCIENCE_DATA)
                                    .filter(m => m.status === 'Suboptimal' || m.status === 'Critical')
                                    .slice(0, 4)
                                    .map((marker) => (
                                        <BiomarkerCard key={marker.id} data={marker} />
                                    ))}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Deep Dive Tabs */}
                <div className="mb-16">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Brain className="h-6 w-6 text-primary" />
                                Deep Dive Analytics
                            </h2>
                            <TabsList>
                                <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                                <TabsTrigger value="hormones">Hormonal</TabsTrigger>
                                <TabsTrigger value="metabolic">Métabolique</TabsTrigger>
                                <TabsTrigger value="inflammation">Inflammation</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="overview" className="mt-0">
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.values(SCIENCE_DATA).map((marker) => (
                                    <BiomarkerCard key={marker.id} data={marker} />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="hormones">
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.values(SCIENCE_DATA).filter(m => m.category === 'Hormonal').map((marker) => (
                                    <BiomarkerCard key={marker.id} data={marker} />
                                ))}
                            </div>
                        </TabsContent>
                        {/* Other tabs would filter similarly */}
                    </Tabs>
                </div>

                {/* Protocol Engine */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-12"
                >
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <Clock className="h-7 w-7 text-primary" />
                                Protocole Quotidien Optimisé
                            </CardTitle>
                            <p className="text-muted-foreground">
                                Généré basé sur vos carences en Vitamine D et profil Hormonal (Ref: Huberman Lab, Attia).
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 gap-8 mt-4">
                                {PROTOCOLS.map((phase, i) => (
                                    <div key={i} className="relative pl-6 border-l-2 border-primary/20">
                                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary" />
                                        <h3 className="text-lg font-bold mb-4">{phase.time}</h3>
                                        <div className="space-y-4">
                                            {phase.items.map((item, j) => (
                                                <div key={j} className="bg-background rounded-lg p-3 shadow-sm border">
                                                    <div className="flex justify-between font-semibold">
                                                        <span>{item.name}</span>
                                                        <Badge variant="secondary">{item.dose}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                        <ArrowRight className="h-3 w-3" /> {item.reason}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

            </main>
            <Footer />
        </div>
    );
}
