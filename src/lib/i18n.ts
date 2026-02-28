export type Language = 'zh' | 'en'

export interface Translations {
  home: {
    greeting: {
      morning: string
      forenoon: string
      afternoon: string
      evening: string
    }
    welcome: string
    subtitle: string
    startCoding: string
    viewProblems: string
    features: {
      practice: {
        title: string
        description: string
      }
      realtime: {
        title: string
        description: string
      }
      progress: {
        title: string
        description: string
      }
    }
    stats: {
      problems: string
      submissions: string
      users: string
    }
    guest: string
  }
  header: {
    title: string
    subtitle: string
    solved: string
  }
  tabs: {
    dashboard: string
    problems: string
    history: string
  }
  dashboard: {
    title: string
    totalProblems: string
    solved: string
    successRate: string
    totalSubmissions: string
    recentActivity: string
    noActivity: string
    difficultyBreakdown: string
    easy: string
    medium: string
    hard: string
    quickStart: string
    startPracticing: string
  }
  problems: {
    title: string
    all: string
    easy: string
    medium: string
    hard: string
    difficulty: string
    status: string
    solved: string
    unsolved: string
    tags: string
    viewProblem: string
    noProblems: string
  }
  problemDetail: {
    backToList: string
    description: string
    inputFormat: string
    outputFormat: string
    constraints: string
    examples: string
    example: string
    input: string
    output: string
    explanation: string
    yourCode: string
    submit: string
    submitting: string
    testResults: string
    testCase: string
    passed: string
    failed: string
    expectedOutput: string
    yourOutput: string
    executionTime: string
    writeCodeHere: string
    recentSubmissions: string
    noSubmissions: string
    viewCode: string
  }
  history: {
    title: string
    noSubmissions: string
    problem: string
    language: string
    status: string
    score: string
    submittedAt: string
    view: string
    accepted: string
    wrongAnswer: string
    runtimeError: string
  }
  status: {
    accepted: string
    wrongAnswer: string
    runtimeError: string
    pending: string
  }
  messages: {
    writeCodeFirst: string
    allTestsPassed: string
    runtimeError: string
    wrongAnswer: string
    testsPassed: string
  }
  common: {
    loading: string
    error: string
    success: string
    cancel: string
    confirm: string
  }
}

export const translations: Record<Language, Translations> = {
  zh: {
    home: {
      greeting: {
        morning: '早上好',
        forenoon: '上午好',
        afternoon: '下午好',
        evening: '晚上好'
      },
      welcome: '欢迎使用编程实验平台',
      subtitle: '在线编程练习、实时评测、高效学习',
      startCoding: '开始编程',
      viewProblems: '浏览题库',
      features: {
        practice: {
          title: '在线编程',
          description: '支持多种编程语言，在线编写和运行代码'
        },
        realtime: {
          title: '实时评测',
          description: '即时反馈测试结果，快速定位问题'
        },
        progress: {
          title: '进度追踪',
          description: '记录学习历程，可视化展示学习进度'
        }
      },
      stats: {
        problems: '题目数量',
        submissions: '提交次数',
        users: '活跃用户'
      },
      guest: '同学'
    },
    header: {
      title: '在线判题平台',
      subtitle: '程序设计实验辅助教学平台',
      solved: '已解决'
    },
    tabs: {
      dashboard: '仪表板',
      problems: '题目',
      history: '历史'
    },
    dashboard: {
      title: '概览',
      totalProblems: '总题目数',
      solved: '已解决',
      successRate: '通过率',
      totalSubmissions: '总提交数',
      recentActivity: '最近活动',
      noActivity: '暂无提交记录',
      difficultyBreakdown: '难度分布',
      easy: '简单',
      medium: '中等',
      hard: '困难',
      quickStart: '快速开始',
      startPracticing: '开始练习'
    },
    problems: {
      title: '题目列表',
      all: '全部',
      easy: '简单',
      medium: '中等',
      hard: '困难',
      difficulty: '难度',
      status: '状态',
      solved: '已解决',
      unsolved: '未解决',
      tags: '标签',
      viewProblem: '查看题目',
      noProblems: '暂无题目'
    },
    problemDetail: {
      backToList: '返回列表',
      description: '题目描述',
      inputFormat: '输入格式',
      outputFormat: '输出格式',
      constraints: '约束条件',
      examples: '示例',
      example: '示例',
      input: '输入',
      output: '输出',
      explanation: '解释',
      yourCode: '你的代码',
      submit: '提交',
      submitting: '提交中...',
      testResults: '测试结果',
      testCase: '测试用例',
      passed: '通过',
      failed: '失败',
      expectedOutput: '期望输出',
      yourOutput: '你的输出',
      executionTime: '执行时间',
      writeCodeHere: '在这里编写你的代码...',
      recentSubmissions: '最近提交',
      noSubmissions: '暂无提交记录',
      viewCode: '查看代码'
    },
    history: {
      title: '提交历史',
      noSubmissions: '暂无提交记录',
      problem: '题目',
      language: '语言',
      status: '状态',
      score: '得分',
      submittedAt: '提交时间',
      view: '查看',
      accepted: '通过',
      wrongAnswer: '答案错误',
      runtimeError: '运行错误'
    },
    status: {
      accepted: '通过',
      wrongAnswer: '答案错误',
      runtimeError: '运行错误',
      pending: '等待中'
    },
    messages: {
      writeCodeFirst: '请先编写代码再提交',
      allTestsPassed: '所有测试通过',
      runtimeError: '运行错误，请检查你的代码',
      wrongAnswer: '答案错误',
      testsPassed: '个测试通过'
    },
    common: {
      loading: '加载中...',
      error: '错误',
      success: '成功',
      cancel: '取消',
      confirm: '确认'
    }
  },
  en: {
    home: {
      greeting: {
        morning: 'Good morning',
        forenoon: 'Good morning',
        afternoon: 'Good afternoon',
        evening: 'Good evening'
      },
      welcome: 'Welcome to Programming Lab',
      subtitle: 'Online coding practice, real-time evaluation, efficient learning',
      startCoding: 'Start Coding',
      viewProblems: 'View Problems',
      features: {
        practice: {
          title: 'Online Coding',
          description: 'Support multiple programming languages, write and run code online'
        },
        realtime: {
          title: 'Real-time Evaluation',
          description: 'Instant feedback on test results, quickly locate issues'
        },
        progress: {
          title: 'Progress Tracking',
          description: 'Record learning journey, visualize learning progress'
        }
      },
      stats: {
        problems: 'Problems',
        submissions: 'Submissions',
        users: 'Active Users'
      },
      guest: 'Guest'
    },
    header: {
      title: 'OJ Platform',
      subtitle: 'Online Judge Practice System',
      solved: 'Solved'
    },
    tabs: {
      dashboard: 'Dashboard',
      problems: 'Problems',
      history: 'History'
    },
    dashboard: {
      title: 'Overview',
      totalProblems: 'Total Problems',
      solved: 'Solved',
      successRate: 'Success Rate',
      totalSubmissions: 'Total Submissions',
      recentActivity: 'Recent Activity',
      noActivity: 'No submissions yet',
      difficultyBreakdown: 'Difficulty Breakdown',
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
      quickStart: 'Quick Start',
      startPracticing: 'Start Practicing'
    },
    problems: {
      title: 'Problem Set',
      all: 'All',
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
      difficulty: 'Difficulty',
      status: 'Status',
      solved: 'Solved',
      unsolved: 'Unsolved',
      tags: 'Tags',
      viewProblem: 'View Problem',
      noProblems: 'No problems available'
    },
    problemDetail: {
      backToList: 'Back to List',
      description: 'Description',
      inputFormat: 'Input Format',
      outputFormat: 'Output Format',
      constraints: 'Constraints',
      examples: 'Examples',
      example: 'Example',
      input: 'Input',
      output: 'Output',
      explanation: 'Explanation',
      yourCode: 'Your Code',
      submit: 'Submit',
      submitting: 'Submitting...',
      testResults: 'Test Results',
      testCase: 'Test Case',
      passed: 'Passed',
      failed: 'Failed',
      expectedOutput: 'Expected Output',
      yourOutput: 'Your Output',
      executionTime: 'Execution Time',
      writeCodeHere: 'Write your code here...',
      recentSubmissions: 'Recent Submissions',
      noSubmissions: 'No submissions yet',
      viewCode: 'View Code'
    },
    history: {
      title: 'Submission History',
      noSubmissions: 'No submissions yet',
      problem: 'Problem',
      language: 'Language',
      status: 'Status',
      score: 'Score',
      submittedAt: 'Submitted At',
      view: 'View',
      accepted: 'Accepted',
      wrongAnswer: 'Wrong Answer',
      runtimeError: 'Runtime Error'
    },
    status: {
      accepted: 'Accepted',
      wrongAnswer: 'Wrong Answer',
      runtimeError: 'Runtime Error',
      pending: 'Pending'
    },
    messages: {
      writeCodeFirst: 'Please write some code before submitting',
      allTestsPassed: 'All tests passed',
      runtimeError: 'Runtime Error. Check your code for errors',
      wrongAnswer: 'Wrong Answer',
      testsPassed: 'tests passed'
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm'
    }
  }
}

export function getTranslation(lang: Language): Translations {
  return translations[lang]
}
