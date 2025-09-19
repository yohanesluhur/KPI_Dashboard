// Dashboard.gs - Dashboard Data Handlers

/**
 * Handle get supervisor dashboard data
 */
function handleGetSupervisorDashboard(data) {
  try {
    if (!data.supervisorId) {
      throw new Error('Supervisor ID is required');
    }
    
    // Get tasks created by this supervisor
    const taskStats = getTaskStatistics({ supervisorId: data.supervisorId });
    
    // Get employee statistics
    const employeeStats = getEmployeeStatistics();
    
    // Get recent activity
    const recentActivity = getRecentActivity(data.supervisorId);
    
    return {
      taskStatistics: taskStats,
      employeeStatistics: employeeStats,
      recentActivity: recentActivity,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error in handleGetSupervisorDashboard:', error);
    throw new Error('Failed to retrieve supervisor dashboard data');
  }
}

/**
 * Handle get employee dashboard data
 */
function handleGetEmployeeDashboard(data) {
  try {
    if (!data.employeeId) {
      throw new Error('Employee ID is required');
    }
    
    // Get task statistics for this employee
    const taskStats = getTaskStatistics({ employeeId: data.employeeId });
    
    // Get recent progress updates
    const recentProgress = getRecentProgressUpdates(data.employeeId);
    
    // Get upcoming deadlines
    const upcomingDeadlines = getUpcomingDeadlines(data.employeeId);
    
    return {
      taskStatistics: taskStats,
      recentProgress: recentProgress,
      upcomingDeadlines: upcomingDeadlines,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error in handleGetEmployeeDashboard:', error);
    throw new Error('Failed to retrieve employee dashboard data');
  }
}

/**
 * Handle get KPI metrics
 */
function handleGetKPIMetrics(data) {
  try {
    const filters = data || {};
    
    // Overall statistics
    const taskStats = getTaskStatistics(filters);
    const employeeStats = getEmployeeStatistics();
    
    // Performance metrics
    const performanceMetrics = getPerformanceMetrics(filters);
    
    // Trend data
    const trendData = getTrendData(filters);
    
    return {
      taskStatistics: taskStats,
      employeeStatistics: employeeStats,
      performanceMetrics: performanceMetrics,
      trendData: trendData,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error in handleGetKPIMetrics:', error);
    throw new Error('Failed to retrieve KPI metrics');
  }
}

/**
 * Get recent activity for supervisor
 */
function getRecentActivity(supervisorId, limit = 10) {
  try {
    const activities = [];
    
    // Get recent tasks
    const taskSheet = getSheet(CONFIG.SHEETS.TASKS);
    const tasks = sheetToObjects(taskSheet);
    const supervisorTasks = tasks
      .filter(task => task.CreatedBy === supervisorId)
      .sort((a, b) => new Date(b.UpdatedAt) - new Date(a.UpdatedAt))
      .slice(0, Math.floor(limit / 2));
    
    supervisorTasks.forEach(task => {
      activities.push({
        type: 'task_updated',
        description: `Task "${task.Description}" updated`,
        timestamp: task.UpdatedAt,
        entityId: task.ID,
        entityType: 'task'
      });
    });
    
    // Get recent progress updates
    const progressSheet = getSheet(CONFIG.SHEETS.PROGRESS);
    const progressEntries = sheetToObjects(progressSheet);
    
    // Filter progress for supervisor's tasks
    const supervisorTaskIds = supervisorTasks.map(task => task.ID);
    const recentProgress = progressEntries
      .filter(entry => supervisorTaskIds.includes(entry.TaskID))
      .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt))
      .slice(0, Math.floor(limit / 2));
    
    recentProgress.forEach(entry => {
      const task = tasks.find(t => t.ID === entry.TaskID);
      activities.push({
        type: 'progress_updated',
        description: `Progress updated to ${entry.Progress}% for "${task ? task.Description : 'Unknown Task'}"`,
        timestamp: entry.CreatedAt,
        entityId: entry.TaskID,
        entityType: 'progress'
      });
    });
    
    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return activities.slice(0, limit);
    
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
}

/**
 * Get recent progress updates for employee
 */
function getRecentProgressUpdates(employeeId, limit = 5) {
  try {
    const progressSheet = getSheet(CONFIG.SHEETS.PROGRESS);
    const progressEntries = sheetToObjects(progressSheet);
    
    const employeeProgress = progressEntries
      .filter(entry => entry.EmployeeID === employeeId)
      .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt))
      .slice(0, limit);
    
    // Get task details for each progress entry
    const taskSheet = getSheet(CONFIG.SHEETS.TASKS);
    const tasks = sheetToObjects(taskSheet);
    
    return employeeProgress.map(entry => {
      const task = tasks.find(t => t.ID === entry.TaskID);
      return {
        id: entry.ID,
        taskId: entry.TaskID,
        taskDescription: task ? task.Description : 'Unknown Task',
        progress: entry.Progress,
        status: entry.Status,
        notes: entry.Notes,
        createdAt: entry.CreatedAt
      };
    });
    
  } catch (error) {
    console.error('Error getting recent progress updates:', error);
    return [];
  }
}

/**
 * Get upcoming deadlines for employee
 */
function getUpcomingDeadlines(employeeId, days = 7) {
  try {
    const taskSheet = getSheet(CONFIG.SHEETS.TASKS);
    const tasks = sheetToObjects(taskSheet);
    
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    const upcomingTasks = tasks
      .filter(task => 
        task.EmployeeID === employeeId &&
        task.Status !== 'completed' &&
        task.DueDate &&
        new Date(task.DueDate) >= now &&
        new Date(task.DueDate) <= futureDate
      )
      .sort((a, b) => new Date(a.DueDate) - new Date(b.DueDate));
    
    return upcomingTasks.map(task => ({
      id: task.ID,
      description: task.Description,
      dueDate: task.DueDate,
      status: task.Status,
      progress: task.Progress,
      daysUntilDue: Math.ceil((new Date(task.DueDate) - now) / (1000 * 60 * 60 * 24))
    }));
    
  } catch (error) {
    console.error('Error getting upcoming deadlines:', error);
    return [];
  }
}

/**
 * Get performance metrics
 */
function getPerformanceMetrics(filters = {}) {
  try {
    const taskSheet = getSheet(CONFIG.SHEETS.TASKS);
    const tasks = sheetToObjects(taskSheet);
    
    let filteredTasks = tasks;
    
    // Apply filters
    if (filters.employeeId) {
      filteredTasks = filteredTasks.filter(task => task.EmployeeID === filters.employeeId);
    }
    
    if (filters.supervisorId) {
      filteredTasks = filteredTasks.filter(task => task.CreatedBy === filters.supervisorId);
    }
    
    const metrics = {
      completionRate: 0,
      onTimeCompletionRate: 0,
      averageTaskDuration: 0,
      productivityScore: 0,
      qualityScore: 0
    };
    
    if (filteredTasks.length === 0) {
      return metrics;
    }
    
    // Calculate completion rate
    const completedTasks = filteredTasks.filter(task => task.Status === 'completed');
    metrics.completionRate = Math.round((completedTasks.length / filteredTasks.length) * 100);
    
    // Calculate on-time completion rate
    const onTimeCompletions = completedTasks.filter(task => {
      if (!task.DueDate || !task.UpdatedAt) return false;
      return new Date(task.UpdatedAt) <= new Date(task.DueDate);
    });
    
    if (completedTasks.length > 0) {
      metrics.onTimeCompletionRate = Math.round((onTimeCompletions.length / completedTasks.length) * 100);
    }
    
    // Calculate average task duration (for completed tasks)
    if (completedTasks.length > 0) {
      const totalDuration = completedTasks.reduce((sum, task) => {
        if (task.CreatedAt && task.UpdatedAt) {
          const duration = new Date(task.UpdatedAt) - new Date(task.CreatedAt);
          return sum + (duration / (1000 * 60 * 60 * 24)); // Convert to days
        }
        return sum;
      }, 0);
      
      metrics.averageTaskDuration = Math.round(totalDuration / completedTasks.length);
    }
    
    // Calculate productivity score (based on completion rate and on-time completion)
    metrics.productivityScore = Math.round((metrics.completionRate + metrics.onTimeCompletionRate) / 2);
    
    // Quality score (placeholder - could be based on feedback, rework, etc.)
    metrics.qualityScore = Math.min(100, Math.round(metrics.onTimeCompletionRate * 1.1));
    
    return metrics;
    
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return {
      completionRate: 0,
      onTimeCompletionRate: 0,
      averageTaskDuration: 0,
      productivityScore: 0,
      qualityScore: 0
    };
  }
}

/**
 * Get trend data for charts
 */
function getTrendData(filters = {}, days = 30) {
  try {
    const taskSheet = getSheet(CONFIG.SHEETS.TASKS);
    const tasks = sheetToObjects(taskSheet);
    
    const progressSheet = getSheet(CONFIG.SHEETS.PROGRESS);
    const progressEntries = sheetToObjects(progressSheet);
    
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Generate daily data points
    const trendData = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Count tasks created on this date
      const tasksCreated = tasks.filter(task => {
        if (!task.CreatedAt) return false;
        const taskDate = new Date(task.CreatedAt).toISOString().split('T')[0];
        return taskDate === dateStr;
      }).length;
      
      // Count tasks completed on this date
      const tasksCompleted = tasks.filter(task => {
        if (!task.UpdatedAt || task.Status !== 'completed') return false;
        const completedDate = new Date(task.UpdatedAt).toISOString().split('T')[0];
        return completedDate === dateStr;
      }).length;
      
      // Count progress updates on this date
      const progressUpdates = progressEntries.filter(entry => {
        if (!entry.CreatedAt) return false;
        const entryDate = new Date(entry.CreatedAt).toISOString().split('T')[0];
        return entryDate === dateStr;
      }).length;
      
      trendData.push({
        date: dateStr,
        tasksCreated: tasksCreated,
        tasksCompleted: tasksCompleted,
        progressUpdates: progressUpdates
      });
    }
    
    return trendData;
    
  } catch (error) {
    console.error('Error getting trend data:', error);
    return [];
  }
}