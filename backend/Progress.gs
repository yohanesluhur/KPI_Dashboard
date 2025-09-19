// Progress.gs - Progress Tracking Handlers

/**
 * Handle get progress by task
 */
function handleGetProgressByTask(data) {
  try {
    if (!data.taskId) {
      throw new Error('Task ID is required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.PROGRESS);
    const progressEntries = sheetToObjects(sheet);
    
    const taskProgress = progressEntries.filter(entry => entry.TaskID === data.taskId);
    
    // Sort by creation date (newest first)
    taskProgress.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
    
    // Convert to frontend format
    const result = taskProgress.map(entry => ({
      id: entry.ID,
      taskId: entry.TaskID,
      employeeId: entry.EmployeeID,
      progress: entry.Progress,
      status: entry.Status,
      notes: entry.Notes,
      createdAt: entry.CreatedAt
    }));
    
    return result;
    
  } catch (error) {
    console.error('Error in handleGetProgressByTask:', error);
    throw new Error('Failed to retrieve progress entries');
  }
}

/**
 * Handle add progress entry
 */
function handleAddProgress(data) {
  try {
    // Validation
    if (!data.taskId) {
      throw new Error('Task ID is required');
    }
    
    if (!data.employeeId) {
      throw new Error('Employee ID is required');
    }
    
    if (data.progress === undefined || data.progress === null) {
      throw new Error('Progress is required');
    }
    
    const progress = parseInt(data.progress);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    
    // Verify task exists
    const taskSheet = getSheet(CONFIG.SHEETS.TASKS);
    const tasks = sheetToObjects(taskSheet);
    const task = tasks.find(t => t.ID === data.taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    // Verify employee exists
    const employeeSheet = getSheet(CONFIG.SHEETS.EMPLOYEES);
    const employees = sheetToObjects(employeeSheet);
    const employee = employees.find(emp => emp.ID === data.employeeId);
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.PROGRESS);
    const progressEntry = {
      ID: generateId(),
      TaskID: data.taskId,
      EmployeeID: data.employeeId,
      Progress: progress,
      Status: data.status || 'in_progress',
      Notes: data.notes || '',
      CreatedAt: new Date().toISOString()
    };
    
    addRowToSheet(sheet, progressEntry);
    
    return {
      id: progressEntry.ID,
      taskId: progressEntry.TaskID,
      employeeId: progressEntry.EmployeeID,
      progress: progressEntry.Progress,
      status: progressEntry.Status,
      notes: progressEntry.Notes,
      createdAt: progressEntry.CreatedAt
    };
    
  } catch (error) {
    console.error('Error in handleAddProgress:', error);
    throw new Error(error.message || 'Failed to add progress entry');
  }
}

/**
 * Handle update progress entry
 */
function handleUpdateProgress(data) {
  try {
    if (!data.progressId) {
      throw new Error('Progress ID is required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.PROGRESS);
    const updateData = {};
    
    // Add fields to update
    if (data.progress !== undefined) {
      const progress = parseInt(data.progress);
      if (isNaN(progress) || progress < 0 || progress > 100) {
        throw new Error('Progress must be between 0 and 100');
      }
      updateData.Progress = progress;
    }
    
    if (data.status !== undefined) {
      if (!['not_started', 'in_progress', 'completed'].includes(data.status)) {
        throw new Error('Invalid status value');
      }
      updateData.Status = data.status;
    }
    
    if (data.notes !== undefined) {
      updateData.Notes = data.notes;
    }
    
    const success = updateRowInSheet(sheet, data.progressId, updateData);
    
    if (!success) {
      throw new Error('Progress entry not found');
    }
    
    // Return updated progress data
    const progressEntries = sheetToObjects(sheet);
    const updatedProgress = progressEntries.find(entry => entry.ID === data.progressId);
    
    return {
      id: updatedProgress.ID,
      taskId: updatedProgress.TaskID,
      employeeId: updatedProgress.EmployeeID,
      progress: updatedProgress.Progress,
      status: updatedProgress.Status,
      notes: updatedProgress.Notes,
      createdAt: updatedProgress.CreatedAt
    };
    
  } catch (error) {
    console.error('Error in handleUpdateProgress:', error);
    throw new Error(error.message || 'Failed to update progress entry');
  }
}

/**
 * Handle delete progress entry
 */
function handleDeleteProgress(data) {
  try {
    if (!data.progressId) {
      throw new Error('Progress ID is required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.PROGRESS);
    const success = deleteRowFromSheet(sheet, data.progressId);
    
    if (!success) {
      throw new Error('Progress entry not found');
    }
    
    return { success: true, message: 'Progress entry deleted successfully' };
    
  } catch (error) {
    console.error('Error in handleDeleteProgress:', error);
    throw new Error(error.message || 'Failed to delete progress entry');
  }
}

/**
 * Get progress statistics for a task
 */
function getTaskProgressStats(taskId) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.PROGRESS);
    const progressEntries = sheetToObjects(sheet);
    
    const taskProgress = progressEntries.filter(entry => entry.TaskID === taskId);
    
    if (taskProgress.length === 0) {
      return {
        totalEntries: 0,
        latestProgress: 0,
        progressTrend: 'stable'
      };
    }
    
    // Sort by creation date
    taskProgress.sort((a, b) => new Date(a.CreatedAt) - new Date(b.CreatedAt));
    
    const latestProgress = taskProgress[taskProgress.length - 1].Progress;
    let progressTrend = 'stable';
    
    if (taskProgress.length >= 2) {
      const previousProgress = taskProgress[taskProgress.length - 2].Progress;
      if (latestProgress > previousProgress) {
        progressTrend = 'increasing';
      } else if (latestProgress < previousProgress) {
        progressTrend = 'decreasing';
      }
    }
    
    return {
      totalEntries: taskProgress.length,
      latestProgress: latestProgress,
      progressTrend: progressTrend,
      firstEntry: taskProgress[0].CreatedAt,
      lastEntry: taskProgress[taskProgress.length - 1].CreatedAt
    };
    
  } catch (error) {
    console.error('Error getting task progress stats:', error);
    return {
      totalEntries: 0,
      latestProgress: 0,
      progressTrend: 'stable'
    };
  }
}