import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Flask, Calendar, Clock, CheckCircle, Warning } from '@phosphor-icons/react'
import { Experiment, Submission } from '@/lib/types'
import { format, isPast } from 'date-fns'
import { motion } from 'framer-motion'

interface ExperimentCardProps {
  experiment: Experiment
  submissions?: Submission[]
  onView: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function ExperimentCard({ 
  experiment, 
  submissions = [],
  onView,
  onEdit,
  onDelete
}: ExperimentCardProps) {
  const latestSubmission = submissions
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0]
  
  const isOverdue = isPast(new Date(experiment.deadline))
  const isCompleted = latestSubmission?.status === 'passed'
  
  const getStatus = () => {
    if (isCompleted) return { label: 'Completed', color: 'success', icon: CheckCircle }
    if (isOverdue) return { label: 'Overdue', color: 'warning', icon: Warning }
    return { label: 'Pending', color: 'muted', icon: Clock }
  }
  
  const status = getStatus()
  const StatusIcon = status.icon
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -4 }}
    >
      <Card 
        className={`p-6 cursor-pointer transition-all hover:shadow-lg border-l-4 ${
          isCompleted ? 'border-l-success' : isOverdue ? 'border-l-warning' : 'border-l-primary'
        }`}
        onClick={onView}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Flask className="text-primary" size={24} weight="duotone" />
            <h3 className="font-semibold text-lg">{experiment.title}</h3>
          </div>
          <Badge 
            variant={status.color === 'success' ? 'default' : status.color === 'warning' ? 'secondary' : 'outline'}
            className={`flex items-center gap-1 ${
              status.color === 'success' ? 'bg-success text-success-foreground' : 
              status.color === 'warning' ? 'bg-warning text-warning-foreground' : ''
            }`}
          >
            <StatusIcon size={14} weight="fill" />
            {status.label}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {experiment.description}
        </p>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>Due: {format(new Date(experiment.deadline), 'MMM d, yyyy')}</span>
          </div>
          <div className="text-xs">
            {experiment.testCases.length} test case{experiment.testCases.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {latestSubmission && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Latest: {format(new Date(latestSubmission.submittedAt), 'MMM d, HH:mm')}
              </span>
              <span className={`font-medium ${
                latestSubmission.status === 'passed' ? 'text-success' : 'text-destructive'
              }`}>
                Score: {latestSubmission.score}%
              </span>
            </div>
          </div>
        )}
        
        {(onEdit || onDelete) && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-border" onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
                Edit
              </Button>
            )}
            {onDelete && (
              <Button variant="destructive" size="sm" onClick={onDelete}>
                Delete
              </Button>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  )
}
