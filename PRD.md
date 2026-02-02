# Online Judge Programming Practice Platform

一个简化的基于Web的平台，供学生练习编程问题并获得自动评判，类似于传统的在线判题系统。支持中英文双语切换。

**Experience Qualities**:
1. **Focused** - Clean, distraction-free interface centered on problem-solving and code submission
2. **Immediate** - Instant feedback on code submissions with clear test results
3. **Encouraging** - Progress tracking and visual feedback to motivate continued practice

**Complexity Level**: Light Application (multiple features with basic state)
This is a student-focused practice platform with core features including problem browsing, code editing, automatic evaluation, and submission history. It maintains a simple, focused scope without complex instructor features or multi-user management.

## Essential Features

### Problem Library
- **Functionality**: Browse available programming problems with difficulty levels and descriptions
- **Purpose**: Provide a catalog of practice problems for students to solve
- **Trigger**: Navigate to Problems tab
- **Progression**: View problem list → Filter by difficulty → Click to view details → Start solving
- **Success criteria**: Problems display with clear descriptions; difficulty levels are visible; problems persist across sessions

### Code Submission & Evaluation
- **Functionality**: Submit code solutions and receive instant evaluation against test cases
- **Purpose**: Allow students to practice and get immediate feedback
- **Trigger**: Click "Submit" button in code editor
- **Progression**: Write code → Click Submit → Tests execute → View results → See which tests passed/failed
- **Success criteria**: Evaluation completes within 2 seconds; clear pass/fail feedback; accurate scoring

### Problem Detail View
- **Functionality**: Display problem statement, input/output format, examples, and constraints
- **Purpose**: Provide all necessary information for solving the problem
- **Trigger**: Click on a problem from the list
- **Progression**: Select problem → Read description → View examples → Write solution in editor → Submit
- **Success criteria**: All problem details are clearly displayed; code editor is accessible; test cases are visible

### Submission History
- **Functionality**: Track all previous submissions with timestamps, scores, and status
- **Purpose**: Allow students to review past attempts and track improvement
- **Trigger**: View history panel for a problem
- **Progression**: Select problem → View submission list → Click to review code → See test results
- **Success criteria**: All submissions logged; chronological ordering; can view past code and results

### Progress Dashboard
- **Functionality**: Visual overview of solved problems and performance statistics
- **Purpose**: Help students track their learning progress
- **Trigger**: Navigate to Dashboard tab
- **Progression**: View dashboard → See stats (total solved, success rate) → View progress charts → Identify areas to practice
- **Success criteria**: Accurate statistics; visual charts render correctly; clear progress indicators

### Language Switching
- **Functionality**: Toggle between Chinese and English interface languages
- **Purpose**: Support both Chinese and English-speaking students
- **Trigger**: Click language switcher button in header
- **Progression**: Click language button → Interface immediately updates to selected language → Preference persists across sessions
- **Success criteria**: All text updates instantly; user preference is saved; default language is Chinese

## Edge Case Handling

- **Empty States**: Display helpful messages when no problems exist or no submissions have been made
- **Invalid Code**: Handle syntax errors and runtime errors gracefully with clear error messages
- **Long Code**: Support large code submissions with scrollable editor and syntax highlighting
- **Network Issues**: Handle offline state gracefully (client-side evaluation)
- **Missing Test Cases**: Ensure all problems have at least one test case configured

## Design Direction

The design should feel like a modern code editor combined with an educational practice tool - clean, technical, and focused. The aesthetic should be professional yet approachable, encouraging students to practice without feeling overwhelming.

## Color Selection

A technical color scheme with clear visual feedback for success/failure states.

- **Primary Color**: Deep blue `oklch(0.45 0.15 250)` - Technical proficiency, used for main actions and navigation
- **Secondary Colors**: 
  - Charcoal `oklch(0.35 0.02 260)` - Supporting elements and borders
  - Light gray `oklch(0.96 0.01 260)` - Card backgrounds
- **Accent Color**: Vibrant cyan `oklch(0.65 0.18 200)` - Successful submissions and progress indicators
- **Additional Colors**:
  - Success green `oklch(0.65 0.17 150)` - Passed test cases
  - Error red `oklch(0.60 0.22 25)` - Failed test cases
  - Warning amber `oklch(0.75 0.15 70)` - Pending or partial success

- **Foreground/Background Pairings**:
  - Background (Soft white `oklch(0.99 0.005 260)`): Dark text (`oklch(0.20 0.02 260)`) - Ratio 15.8:1 ✓
  - Primary (Deep Blue): White text - Ratio 7.2:1 ✓
  - Accent (Cyan): White text - Ratio 5.1:1 ✓
  - Success (Green): White text - Ratio 5.4:1 ✓
  - Error (Red): White text - Ratio 5.8:1 ✓

## Font Selection

Typography focused on code readability and clear information hierarchy.

- **Primary Font**: Space Grotesk - Modern geometric sans-serif for UI elements
- **Code Font**: JetBrains Mono - Professional monospace font for code display

- **Typographic Hierarchy**:
  - H1 (Page Title): Space Grotesk Bold/28px/tight tracking
  - H2 (Problem Title): Space Grotesk Semibold/22px/normal
  - H3 (Section Headers): Space Grotesk Medium/18px/normal
  - Body (Content): Space Grotesk Regular/15px/relaxed leading (1.6)
  - Code: JetBrains Mono Regular/14px/normal leading (1.5)
  - Small (Metadata): Space Grotesk Regular/13px

## Animations

Animations should feel snappy and purposeful, like a professional development tool.

- **Submission Feedback**: 300ms spring animation for success indicators, reinforcing achievement
- **Card Hover**: 150ms ease-out lift with subtle shadow, showing interactivity
- **Tab Transitions**: 200ms ease-out for smooth view changes
- **Chart Animations**: Smooth data transitions when statistics update
- **Status Updates**: Brief pulse animation (200ms) when test results appear

## Component Selection

- **Components**:
  - **Tabs**: Main navigation (Dashboard, Problems, History)
  - **Card**: Problem cards and submission containers
  - **Button**: Submit code, filter problems, navigation actions
  - **Badge**: Difficulty levels (Easy, Medium, Hard) and status indicators (Accepted, Wrong Answer)
  - **Textarea/Code Editor**: Code input with monospace font
  - **Progress**: Overall problem-solving progress bar
  - **Table**: Display test results and submission history
  - **Separator**: Visual section division
  - **ScrollArea**: Long code and problem descriptions
  - **Alert**: System messages and evaluation feedback

- **Customizations**:
  - **Code Editor Panel**: Custom textarea with line numbers simulation and monospace styling
  - **Test Result Display**: Custom component showing test case outcomes with collapsible details
  - **Problem Card**: Custom card with difficulty badge and solved status indicator
  - **Stats Card**: Custom cards for dashboard metrics with icons

- **States**:
  - Buttons: Solid primary with hover lift; loading state during evaluation
  - Problem Cards: Hover elevation increase; solved problems have success border accent
  - Input Fields: Focus state with accent border; error state with red border
  - Status Badges: Color-coded (green=accepted, red=wrong answer, gray=pending)

- **Icon Selection** (Phosphor Icons):
  - Code: Code-related views and actions
  - CheckCircle: Accepted/passed submissions
  - XCircle: Wrong answer/failed tests
  - Clock: Pending evaluation
  - Play: Submit/run code
  - List: Problem list and history
  - ChartBar: Statistics and progress
  - Fire: Difficulty indicator
  - Trophy: Achievements and milestones

- **Spacing**:
  - Page margins: px-6 py-4
  - Card padding: p-6
  - Grid gaps: gap-4
  - Form spacing: space-y-4
  - Button padding: px-4 py-2
  - Icon spacing: gap-2

- **Mobile**:
  - Problem list becomes full-width stacked cards
  - Code editor expands to full screen for better editing
  - Statistics cards stack vertically
  - Test results use accordion instead of table
  - Tabs convert to bottom navigation bar
