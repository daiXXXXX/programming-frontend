import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { Experiment, TestCase } from '@/lib/types'
import { Card } from '@/components/ui/card'

interface CreateExperimentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (experiment: Omit<Experiment, 'id' | 'createdAt'>) => void
  initialData?: Experiment
}

export function CreateExperimentDialog({ 
  open, 
  onOpenChange, 
  onSave,
  initialData 
}: CreateExperimentDialogProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [requirements, setRequirements] = useState(initialData?.requirements || '')
  const [deadline, setDeadline] = useState(
    initialData?.deadline ? new Date(initialData.deadline).toISOString().slice(0, 16) : ''
  )
  const [testCases, setTestCases] = useState<TestCase[]>(
    initialData?.testCases || [{ id: crypto.randomUUID(), input: '', expectedOutput: '', description: '' }]
  )

  const handleAddTestCase = () => {
    setTestCases([...testCases, { id: crypto.randomUUID(), input: '', expectedOutput: '', description: '' }])
  }

  const handleRemoveTestCase = (id: string) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter(tc => tc.id !== id))
    }
  }

  const handleTestCaseChange = (id: string, field: keyof TestCase, value: string) => {
    setTestCases(testCases.map(tc => 
      tc.id === id ? { ...tc, [field]: value } : tc
    ))
  }

  const handleSubmit = () => {
    if (!title || !description || !deadline || testCases.some(tc => !tc.input || !tc.expectedOutput)) {
      return
    }

    onSave({
      title,
      description,
      requirements,
      deadline: new Date(deadline).toISOString(),
      testCases
    })

    setTitle('')
    setDescription('')
    setRequirements('')
    setDeadline('')
    setTestCases([{ id: crypto.randomUUID(), input: '', expectedOutput: '', description: '' }])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Experiment' : 'Create New Experiment'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Sorting Algorithms Implementation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the experiment objectives and overview..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements</Label>
            <Textarea
              id="requirements"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="List specific requirements, constraints, or guidelines..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline *</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Test Cases *</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleAddTestCase}
              >
                <Plus size={16} className="mr-2" />
                Add Test Case
              </Button>
            </div>

            <div className="space-y-3">
              {testCases.map((testCase, index) => (
                <Card key={testCase.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">Test Case {index + 1}</h4>
                    {testCases.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTestCase(testCase.id)}
                      >
                        <Trash size={16} className="text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Description (optional)</Label>
                      <Input
                        value={testCase.description}
                        onChange={(e) => handleTestCaseChange(testCase.id, 'description', e.target.value)}
                        placeholder="e.g., Sort ascending order"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Input *</Label>
                      <Textarea
                        value={testCase.input}
                        onChange={(e) => handleTestCaseChange(testCase.id, 'input', e.target.value)}
                        placeholder="Enter test input..."
                        className="font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Expected Output *</Label>
                      <Textarea
                        value={testCase.expectedOutput}
                        onChange={(e) => handleTestCaseChange(testCase.id, 'expectedOutput', e.target.value)}
                        placeholder="Enter expected output..."
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {initialData ? 'Update' : 'Create'} Experiment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
