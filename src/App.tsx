import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  UserCircle, 
  ChartBar, 
  Flask, 
  Code, 
  ListBullets,
  Play 
} from '@phosphor-icons/react'
import { Experiment, Submission, UserRole } from '@/lib/types'
import { ExperimentCard } from '@/components/ExperimentCard'
import { CreateExperimentDialog } from '@/components/CreateExperimentDialog'
import { CodeEditor } from '@/components/CodeEditor'
import { TestResultPanel } from '@/components/TestResultPanel'
import { evaluateCode, calculateScore, getSubmissionStatus } from '@/lib/evaluator'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { motion } from 'framer-motion'

function App() {
  const [role, setRole] = useState<UserRole>('student')
  const [experiments, setExperiments] = useKV<Experiment[]>('experiments', [])
  const [submissions, setSubmissions] = useKV<Submission[]>('submissions', [])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null)
  const [currentCode, setCurrentCode] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null)

  const experimentsList = experiments || []
  const submissionsList = submissions || []

  const handleCreateExperiment = (experimentData: Omit<Experiment, 'id' | 'createdAt'>) => {
    const newExperiment: Experiment = {
      ...experimentData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    }
    
    setExperiments((current) => [...(current || []), newExperiment])
    toast.success('Experiment created successfully!')
  }

  const handleDeleteExperiment = (id: string) => {
    setExperiments((current) => (current || []).filter(e => e.id !== id))
    setSubmissions((current) => (current || []).filter(s => s.experimentId !== id))
    toast.success('Experiment deleted')
  }

  const handleSubmitCode = () => {
    if (!selectedExperiment || !currentCode.trim()) {
      toast.error('Please write some code before submitting')
      return
    }

    const testResults = evaluateCode(currentCode, selectedExperiment.testCases)
    const score = calculateScore(testResults)
    const status = getSubmissionStatus(testResults)

    const newSubmission: Submission = {
      id: crypto.randomUUID(),
      experimentId: selectedExperiment.id,
      code: currentCode,
      submittedAt: new Date().toISOString(),
      testResults,
      score,
      status
    }

    setSubmissions((current) => [...(current || []), newSubmission])
    setViewingSubmission(newSubmission)

    if (status === 'passed') {
      toast.success(`All tests passed! Score: ${score}%`)
    } else {
      toast.error(`Some tests failed. Score: ${score}%`)
    }
  }

  const handleViewExperiment = (experiment: Experiment) => {
    setSelectedExperiment(experiment)
    setViewingSubmission(null)
    setActiveTab('experiments')
    
    const lastSubmission = submissionsList
      .filter(s => s.experimentId === experiment.id)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0]
    
    if (lastSubmission) {
      setCurrentCode(lastSubmission.code)
    } else {
      setCurrentCode('')
    }
  }

  const experimentSubmissions = selectedExperiment
    ? submissionsList.filter(s => s.experimentId === selectedExperiment.id)
    : []

  const completedCount = experimentsList.filter(exp => {
    const expSubmissions = submissionsList.filter(s => s.experimentId === exp.id)
    return expSubmissions.some(s => s.status === 'passed')
  }).length

  const completionPercentage = experimentsList.length > 0 
    ? Math.round((completedCount / experimentsList.length) * 100) 
    : 0

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flask size={32} weight="duotone" className="text-primary" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Programming Lab</h1>
                <p className="text-sm text-muted-foreground">Experiment Teaching Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant={role === 'instructor' ? 'default' : 'outline'}
                onClick={() => setRole(role === 'instructor' ? 'student' : 'instructor')}
                className="gap-2"
              >
                <UserCircle size={20} />
                {role === 'instructor' ? 'Instructor Mode' : 'Student Mode'}
              </Button>
              <Avatar>
                <AvatarFallback>{role === 'instructor' ? 'IN' : 'ST'}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
            <TabsTrigger value="dashboard" className="gap-2">
              <ChartBar size={18} />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="experiments" className="gap-2">
              <Flask size={18} />
              Experiments
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-2">
              <ListBullets size={18} />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6">Progress Overview</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <div className="text-sm text-muted-foreground mb-1">Total Experiments</div>
                    <div className="text-3xl font-bold text-primary">{experimentsList.length}</div>
                  </Card>
                  <Card className="p-4 bg-success/5 border-success/20">
                    <div className="text-sm text-muted-foreground mb-1">Completed</div>
                    <div className="text-3xl font-bold text-success">{completedCount}</div>
                  </Card>
                  <Card className="p-4 bg-accent/5 border-accent/20">
                    <div className="text-sm text-muted-foreground mb-1">Success Rate</div>
                    <div className="text-3xl font-bold text-accent">{completionPercentage}%</div>
                  </Card>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Completion</span>
                    <span className="text-sm text-muted-foreground">{completedCount} / {experimentsList.length}</span>
                  </div>
                  <Progress value={completionPercentage} className="h-3" />
                </div>
              </Card>
            </motion.div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Experiments</h2>
              {experimentsList.length === 0 ? (
                <Card className="p-12 text-center">
                  <Flask size={48} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
                  <h3 className="font-semibold mb-2">No experiments yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {role === 'instructor' 
                      ? 'Create your first experiment to get started'
                      : 'Check back later for new experiments'}
                  </p>
                  {role === 'instructor' && (
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus size={18} className="mr-2" />
                      Create Experiment
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {experimentsList.slice(-6).reverse().map(exp => (
                    <ExperimentCard
                      key={exp.id}
                      experiment={exp}
                      submissions={submissionsList.filter(s => s.experimentId === exp.id)}
                      onView={() => handleViewExperiment(exp)}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="experiments" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {selectedExperiment ? selectedExperiment.title : 'All Experiments'}
              </h2>
              {role === 'instructor' && !selectedExperiment && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus size={18} className="mr-2" />
                  Create Experiment
                </Button>
              )}
              {selectedExperiment && (
                <Button variant="outline" onClick={() => setSelectedExperiment(null)}>
                  Back to List
                </Button>
              )}
            </div>

            {!selectedExperiment ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {experimentsList.map(exp => (
                  <ExperimentCard
                    key={exp.id}
                    experiment={exp}
                    submissions={submissionsList.filter(s => s.experimentId === exp.id)}
                    onView={() => handleViewExperiment(exp)}
                    onEdit={role === 'instructor' ? () => {} : undefined}
                    onDelete={role === 'instructor' ? () => handleDeleteExperiment(exp.id) : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="font-semibold text-lg mb-4">Experiment Details</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
                        <p className="text-sm">{selectedExperiment.description}</p>
                      </div>
                      {selectedExperiment.requirements && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Requirements</div>
                          <p className="text-sm whitespace-pre-wrap">{selectedExperiment.requirements}</p>
                        </div>
                      )}
                      <Separator />
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Deadline</div>
                        <p className="text-sm">{format(new Date(selectedExperiment.deadline), 'PPP p')}</p>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Test Cases</div>
                        <p className="text-sm">{selectedExperiment.testCases.length} test cases configured</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="font-semibold text-lg mb-4">Submission History</h3>
                    {experimentSubmissions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No submissions yet</p>
                    ) : (
                      <div className="space-y-2">
                        {experimentSubmissions
                          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                          .slice(0, 5)
                          .map(sub => (
                            <Card 
                              key={sub.id} 
                              className="p-3 cursor-pointer hover:bg-accent/5"
                              onClick={() => {
                                setViewingSubmission(sub)
                                setCurrentCode(sub.code)
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm">
                                  {format(new Date(sub.submittedAt), 'MMM d, HH:mm')}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={sub.status === 'passed' ? 'default' : 'secondary'}
                                    className={sub.status === 'passed' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}
                                  >
                                    {sub.score}%
                                  </Badge>
                                </div>
                              </div>
                            </Card>
                          ))}
                      </div>
                    )}
                  </Card>
                </div>

                <div className="space-y-6">
                  <CodeEditor
                    value={currentCode}
                    onChange={setCurrentCode}
                    disabled={role === 'instructor'}
                  />
                  
                  {role === 'student' && (
                    <Button 
                      onClick={handleSubmitCode} 
                      className="w-full gap-2"
                      size="lg"
                    >
                      <Play size={20} weight="fill" />
                      Submit & Evaluate
                    </Button>
                  )}

                  {viewingSubmission && (
                    <TestResultPanel
                      testResults={viewingSubmission.testResults}
                      testCases={selectedExperiment.testCases}
                    />
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <h2 className="text-2xl font-bold">All Submissions</h2>
            
            {submissionsList.length === 0 ? (
              <Card className="p-12 text-center">
                <Code size={48} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
                <h3 className="font-semibold mb-2">No submissions yet</h3>
                <p className="text-sm text-muted-foreground">
                  Complete experiments to see your submission history
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {submissionsList
                  .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                  .map(sub => {
                    const experiment = experimentsList.find(e => e.id === sub.experimentId)
                    if (!experiment) return null

                    return (
                      <Card key={sub.id} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">{experiment.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              Submitted {format(new Date(sub.submittedAt), 'PPP p')}
                            </p>
                          </div>
                          <Badge 
                            variant={sub.status === 'passed' ? 'default' : 'secondary'}
                            className={`${sub.status === 'passed' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'} text-lg px-3 py-1`}
                          >
                            {sub.score}%
                          </Badge>
                        </div>

                        <div className="text-sm mb-4">
                          <span className="text-muted-foreground">Test Results: </span>
                          <span className="font-medium">
                            {sub.testResults.filter(r => r.passed).length} / {sub.testResults.length} passed
                          </span>
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedExperiment(experiment)
                            setViewingSubmission(sub)
                            setCurrentCode(sub.code)
                            setActiveTab('experiments')
                          }}
                        >
                          View Details
                        </Button>
                      </Card>
                    )
                  })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <CreateExperimentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleCreateExperiment}
      />
    </div>
  )
}

export default App