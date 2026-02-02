# Programming Experiment Teaching Assistant Platform

A comprehensive web-based platform for managing programming experiments, tracking student submissions, and facilitating hands-on learning in computer science courses.

**Experience Qualities**:
1. **Efficient** - Streamlined workflows for both instructors and students to manage experiments without unnecessary complexity
2. **Organized** - Clear structure for experiments, submissions, and feedback with intuitive navigation between different sections
3. **Motivating** - Visual progress tracking and immediate feedback to encourage student engagement and learning

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
This is a multi-user educational platform with distinct roles (instructor/student), multiple interconnected features (experiment management, code submission, evaluation, progress tracking), and requires sophisticated state management across different views and user contexts.

## Essential Features

### User Role Management
- **Functionality**: Switch between instructor and student views with different capabilities
- **Purpose**: Enable testing both perspectives and demonstrate the platform's dual functionality
- **Trigger**: Role selector in the main navigation
- **Progression**: Click role toggle → UI updates to show role-specific features → Access appropriate functionality
- **Success criteria**: All role-specific features display correctly; no student can access instructor-only functions

### Experiment Creation & Management
- **Functionality**: Instructors create programming experiments with title, description, requirements, test cases, and deadlines
- **Purpose**: Provide structured assignments for students to complete
- **Trigger**: Instructor clicks "Create Experiment" button
- **Progression**: Open creation dialog → Fill in experiment details → Add test cases → Set deadline → Save → Experiment appears in list
- **Success criteria**: Experiments persist across sessions; all metadata displays correctly; can edit and delete experiments

### Code Submission Interface
- **Functionality**: Students submit code solutions with syntax highlighting and instant validation
- **Purpose**: Allow students to complete and submit their work with immediate feedback
- **Trigger**: Student selects an experiment and clicks "Submit Solution"
- **Progression**: Select experiment → Write/paste code in editor → Submit → View evaluation results → See pass/fail status
- **Success criteria**: Code persists in editor; submissions are saved with timestamps; evaluation runs against test cases

### Automated Evaluation System
- **Functionality**: Run submitted code against predefined test cases and provide immediate results
- **Purpose**: Give instant feedback to students on their solution correctness
- **Trigger**: Student submits code solution
- **Progression**: Code submitted → Test cases execute → Results computed → Display pass/fail for each case → Overall score calculated
- **Success criteria**: Evaluation completes within 2 seconds; clear feedback on which tests passed/failed; scoring is accurate

### Progress Dashboard
- **Functionality**: Visual representation of completion status for all experiments
- **Purpose**: Help students track their learning progress and identify pending work
- **Trigger**: Navigate to dashboard view
- **Progression**: View dashboard → See experiment cards with status badges → Identify completed/pending/overdue items → Click to view details
- **Success criteria**: Accurate status for each experiment; visual distinction between states; clickable navigation to experiments

### Submission History
- **Functionality**: View all previous submissions with timestamps and scores
- **Purpose**: Track improvement over time and allow students to review past attempts
- **Trigger**: Click on "View History" for an experiment
- **Progression**: Select experiment → View history panel → See list of submissions with dates and scores → Click to view code
- **Success criteria**: All submissions are logged; chronological ordering; can view code from any past submission

## Edge Case Handling

- **Empty States**: Display helpful onboarding messages when no experiments exist, guiding instructors to create first experiment and students to check back later
- **Overdue Submissions**: Mark overdue experiments with warning colors and still allow submission with "late" badge, preventing students from being blocked
- **Invalid Code**: Handle syntax errors and runtime errors gracefully with clear error messages, preventing system crashes from student code
- **Duplicate Names**: Allow experiments with same names but display creation timestamps to distinguish them
- **Missing Test Cases**: Require at least one test case before experiment can be created, with validation message
- **Long Code**: Handle large code submissions with scrollable editor and syntax highlighting performance optimization

## Design Direction

The design should evoke a sense of academic professionalism combined with modern software development tools. It should feel like a hybrid between a code editor (focused, technical, clean) and an educational dashboard (encouraging, informative, organized). The aesthetic should be crisp and technical while remaining approachable for students.

## Color Selection

A technical yet warm color scheme that balances the serious nature of programming with educational encouragement.

- **Primary Color**: Deep blue `oklch(0.45 0.15 250)` - Represents technical proficiency and academic authority, used for instructor actions and key CTAs
- **Secondary Colors**: 
  - Warm slate `oklch(0.35 0.02 260)` - Supporting color for secondary actions and borders
  - Soft gray `oklch(0.96 0.01 260)` - For backgrounds and cards
- **Accent Color**: Vibrant cyan `oklch(0.65 0.18 200)` - Attention-grabbing for successful submissions, completed experiments, and positive feedback
- **Additional Colors**:
  - Warning amber `oklch(0.75 0.15 70)` - For overdue experiments and pending reviews
  - Success green `oklch(0.65 0.17 150)` - For passed test cases
  - Error red `oklch(0.60 0.22 25)` - For failed test cases

- **Foreground/Background Pairings**:
  - Background (Soft white #FAFBFC - `oklch(0.99 0.005 260)`): Dark text (#1C2536 - `oklch(0.20 0.02 260)`) - Ratio 15.8:1 ✓
  - Primary (Deep Blue): White text (#FFFFFF) - Ratio 7.2:1 ✓
  - Accent (Vibrant Cyan): White text (#FFFFFF) - Ratio 5.1:1 ✓
  - Card (Soft Gray): Dark text (#1C2536) - Ratio 14.1:1 ✓

## Font Selection

Typography should feel technical and code-oriented while maintaining excellent readability for educational content.

- **Primary Font**: Space Grotesk - A geometric sans-serif with a technical feel, perfect for the modern developer aesthetic
- **Code Font**: JetBrains Mono - Industry-standard monospace font for code display with excellent ligature support

- **Typographic Hierarchy**:
  - H1 (Page Title): Space Grotesk Bold/32px/tight tracking (-0.02em)
  - H2 (Section Headers): Space Grotesk Semibold/24px/normal tracking
  - H3 (Card Headers): Space Grotesk Medium/18px/normal tracking  
  - Body (General Text): Space Grotesk Regular/15px/relaxed leading (1.6)
  - Code Display: JetBrains Mono Regular/14px/normal leading (1.5)
  - Small Text (Metadata): Space Grotesk Regular/13px/normal tracking

## Animations

Animations should feel snappy and technical, like interactions in a professional IDE. Use animations to:
- **State Transitions**: 200ms ease-out for tab switches and view changes, maintaining spatial awareness
- **Submission Feedback**: Brief celebratory motion (300ms spring) when tests pass, conveying achievement
- **Card Interactions**: Subtle lift on hover (150ms) with slight shadow increase, making items feel interactive
- **Progress Updates**: Smooth value transitions for scores and completion percentages using number counting
- **List Updates**: Staggered fade-in for newly created experiments (50ms delay between items)

## Component Selection

- **Components**:
  - **Tabs**: Main navigation between Dashboard, Experiments, Submissions views
  - **Card**: Container for individual experiments with hover states
  - **Dialog**: Experiment creation and editing forms with validation
  - **Button**: Primary actions (submit, create) with distinct variants for instructor vs student actions
  - **Badge**: Status indicators (completed, pending, overdue, passed, failed)
  - **Textarea**: Code input area with monospace font, expandable
  - **Form**: Experiment creation with react-hook-form validation
  - **Progress**: Visual indicator for overall completion percentage
  - **Separator**: Clean division between sections
  - **Alert**: Display evaluation results and system messages
  - **ScrollArea**: Handle long code and submission lists
  - **Avatar**: User identification in navigation (simulated users)
  - **Table**: Display test case results in structured format

- **Customizations**:
  - **Code Editor Card**: Custom component wrapping textarea with line numbers, syntax highlighting indicator, and character count
  - **Experiment Status Card**: Custom card variant with colored left border indicating status
  - **Test Result Panel**: Custom component showing individual test case outcomes with expandable details
  - **Progress Ring**: Custom circular progress indicator for dashboard summary

- **States**:
  - Buttons: Default has solid background with hover lift; disabled state is muted with reduced opacity
  - Experiment Cards: Default elevation 1, hover elevation 2 with border color shift, active/selected has accent border
  - Input Fields: Focused state has accent border with subtle glow; error state shows red border with shake animation
  - Status Badges: Static elements with icon + text, color-coded (green=completed, amber=pending, red=overdue)

- **Icon Selection** (Phosphor Icons):
  - FlaskConical: Experiments and lab work
  - Code: Code-related actions and views
  - CheckCircle: Passed tests and completed work
  - XCircle: Failed tests
  - Clock: Pending/in-progress
  - Warning: Overdue items
  - Plus: Create new experiment
  - Play: Run/submit code
  - User/UserCircle: Role switching
  - ChartBar: Dashboard and statistics
  - List: Submission history
  - Calendar: Deadlines

- **Spacing**:
  - Page margins: px-6 py-4 (24px, 16px)
  - Card padding: p-6 (24px)
  - Card gaps in grid: gap-4 (16px)
  - Form field spacing: space-y-4 (16px vertical between fields)
  - Button padding: px-4 py-2 (16px, 8px)
  - Tight inline spacing (badges, icons): gap-2 (8px)

- **Mobile**:
  - Tabs convert to vertical navigation drawer with hamburger menu
  - Experiment cards stack full-width instead of grid layout
  - Code editor becomes full-screen modal on mobile for better editing experience
  - Table view for test results becomes accordion list with collapsible rows
  - Dashboard stats transition from horizontal cards to vertical stacked layout
  - Form dialogs become full-screen overlays for maximum space utilization
