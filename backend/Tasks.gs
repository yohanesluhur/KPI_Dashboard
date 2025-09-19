// Tasks.gs - Task Management Handlers

/**
 * Handle get all tasks
 */
function handleGetTasks() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    const tasks = sheetToObjects(sheet);
    
    // Convert to frontend format
    const result = tasks.map(task => ({
      id: task.ID,
      description: task.Description,
      employeeId: task.EmployeeID,
      dueDate: task.DueDate,
      status: task.Status,
      progress: task.Progress,
      createdBy: task.CreatedBy,
      createdAt: task.CreatedAt,
      updatedAt: task.UpdatedAt,
      lastUpdate: task.LastUpdate
    }));
    
    return result;
    
  } catch (error) {
    console.error('Error in handleGetTasks:', error);
    throw new Error('Failed to retrieve tasks');
  }
}

/**
 * Handle get tasks by employee
 */
function handleGetTasksByEmployee(data) {
  try {
    if (!data.employeeId) {
      throw new Error('Employee ID is required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    const tasks = sheetToObjects(sheet);
    
    const employeeTasks = tasks.filter(task => task.EmployeeID === data.employeeId);
    
    // Convert to frontend format
    const result = employeeTasks.map(task => ({
      id: task.ID,
      description: task.Description,
      employeeId: task.EmployeeID,
      dueDate: task.DueDate,
      status: task.Status,
      progress: task.Progress,
      createdBy: task.CreatedBy,
      createdAt: task.CreatedAt,
      updatedAt: task.UpdatedAt,
      lastUpdate: task.LastUpdate
    }));
    
    return result;
    
  } catch (error) {
    console.error('Error in handleGetTasksByEmployee:', error);
    throw new Error('Failed to retrieve employee tasks');
  }
}

/**
 * Handle get tasks by supervisor
 */
function handleGetTasksBySupervisor(data) {
  try {
    if (!data.supervisorId) {
      throw new Error('Supervisor ID is required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    const tasks = sheetToObjects(sheet);
    
    // Get tasks created by this supervisor or assigned to their team
    const supervisorTasks = tasks.filter(task => 
      task.CreatedBy === data.supervisorId
    );
    
    // Convert to frontend format
    const result = supervisorTasks.map(task => ({
      id: task.ID,
      description: task.Description,
      employeeId: task.EmployeeID,
      dueDate: task.DueDate,
      status: task.Status,
      progress: task.Progress,
      createdBy: task.CreatedBy,
      createdAt: task.CreatedAt,
      updatedAt: task.UpdatedAt,
      lastUpdate: task.LastUpdate
    }));
    
    return result;
    
  } catch (error) {
    console.error('Error in handleGetTasksBySupervisor:', error);
    throw new Error('Failed to retrieve supervisor tasks');
  }
}

/**
 * Handle add task
 */
function handleAddTask(data) {
  try {
    // Validation
    if (!data.description || !data.description.trim()) {
      throw new Error('Task description is required');
    }
    
    if (!data.employeeId) {
      throw new Error('Employee assignment is required');
    }
    
    if (!data.dueDate) {
      throw new Error('Due date is required');
    }
    
    // Validate due date format
    if (!isValidDate(data.dueDate)) {
      throw new Error('Invalid due date format');
    }
    
    // Verify employee exists
    const employeeSheet = getSheet(CONFIG.SHEETS.EMPLOYEES);
    const employees = sheetToObjects(employeeSheet);
    const employee = employees.find(emp => emp.ID === data.employeeId);
    
    if (!employee) {
      throw new Error('Assigned employee not found');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    const task = {
      ID: generateId(),
      Description: data.description.trim(),
      EmployeeID: data.employeeId,
      DueDate: data.dueDate,
      Status: data.status || 'not_started',
      Progress: data.progress || 0,
      CreatedBy: data.createdBy,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
      LastUpdate: new Date().toISOString()
    };
    
    addRowToSheet(sheet, task);
    
    return {
      id: task.ID,
      description: task.Description,
      employeeId: task.EmployeeID,
      dueDate: task.DueDate,
      status: task.Status,
      progress: task.Progress,
      createdBy: task.CreatedBy,
      createdAt: task.CreatedAt,
      updatedAt: task.UpdatedAt,
      lastUpdate: task.LastUpdate
    };
    
  } catch (error) {
    console.error('Error in handleAddTask:', error);
    throw new Error(error.message || 'Failed to add task');
  }
}

/**
 * Handle update task
 */
function handleUpdateTask(data) {
  try {
    if (!data.taskId) {
      throw new Error('Task ID is required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    const updateData = {
      UpdatedAt: new Date().toISOString(),
      LastUpdate: new Date().toISOString()
    };
    
    // Add fields to update
    if (data.description !== undefined) {
      if (!data.description.trim()) {
        throw new Error('Task description cannot be empty');
      }
      updateData.Description = data.description.trim();
    }
    
    if (data.employeeId !== undefined) {
      // Verify employee exists
      const employeeSheet = getSheet(CONFIG.SHEETS.EMPLOYEES);
      const employees = sheetToObjects(employeeSheet);
      const employee = employees.find(emp => emp.ID === data.employeeId);
      
      if (!employee) {
        throw new Error('Assigned employee not found');
      }
      
      updateData.EmployeeID = data.employeeId;
    }
    
    if (data.dueDate !== undefined) {
      if (!isValidDate(data.dueDate)) {
        throw new Error('Invalid due date format');
      }
      updateData.DueDate = data.dueDate;
    }
    
    if (data.status !== undefined) {
      if (!['not_started', 'in_progress', 'completed'].includes(data.status)) {
        throw new Error('Invalid status value');
      }
      updateData.Status = data.status;
    }
    
    if (data.progress !== undefined) {
      const progress = parseInt(data.progress);
      if (isNaN(progress) || progress < 0 || progress > 100) {
        throw new Error('Progress must be between 0 and 100');
      }
      updateData.Progress = progress;
    }
    
    const success = updateRowInSheet(sheet, data.taskId, updateData);
    
    if (!success) {
      throw new Error('Task not found');
    }
    
    // Return updated task data
    const tasks = sheetToObjects(sheet);
    const updatedTask = tasks.find(task => task.ID === data.taskId);
    
    return {
      id: updatedTask.ID,
      description: updatedTask.Description,
      employeeId: updatedTask.EmployeeID,
      dueDate: updatedTask.DueDate,
      status: updatedTask.Status,
      progress: updatedTask.Progress,
      createdBy: updatedTask.CreatedBy,
      createdAt: updatedTask.CreatedAt,
      updatedAt: updatedTask.UpdatedAt,
      lastUpdate: updatedTask.LastUpdate
    };
    
  } catch (error) {
    console.error('Error in handleUpdateTask:', error);
    throw new Error(error.message || 'Failed to update task');
  }
}

/**
 * Handle delete task
 */
function handleDeleteTask(data) {
  try {
    if (!data.taskId) {
      throw new Error('Task ID is required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    const success = deleteRowFromSheet(sheet, data.taskId);
    
    if (!success) {
      throw new Error('Task not found');
    }
    
    // Also delete related progress entries
    const progressSheet = getSheet(CONFIG.SHEETS.PROGRESS);
    const progressEntries = sheetToObjects(progressSheet);
    
    progressEntries.forEach(entry => {
      if (entry.TaskID === data.taskId) {
        deleteRowFromSheet(progressSheet, entry.ID);
      }
    });
    
    return { success: true, message: 'Task deleted successfully' };
    
  } catch (error) {
    console.error('Error in handleDeleteTask:', error);
    throw new Error(error.message || 'Failed to delete task');
  }
}

/**
 * Validate date format
 */
function isValidDate(dateString) {
  try {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  } catch (error) {
    return false;
  }
}

/**
 * Get task statistics
 */
function getTaskStatistics(filters = {}) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    const tasks = sheetToObjects(sheet);
    
    let filteredTasks = tasks;
    
    // Apply filters
    if (filters.employeeId) {
      filteredTasks = filteredTasks.filter(task => task.EmployeeID === filters.employeeId);
    }
    
    if (filters.supervisorId) {
      filteredTasks = filteredTasks.filter(task => task.CreatedBy === filters.supervisorId);
    }
    
    const stats = {
      total: filteredTasks.length,
      byStatus: {},
      overdue: 0,
      dueToday: 0,
      dueSoon: 0,
      avgProgress: 0
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    let totalProgress = 0;
    
    filteredTasks.forEach(task => {
      // Count by status
      stats.byStatus[task.Status] = (stats.byStatus[task.Status] || 0) + 1;
      
      // Count overdue/due soon
      if (task.DueDate && task.Status !== 'completed') {
        const dueDate = new Date(task.DueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today) {
          stats.overdue++;
        } else if (dueDate.getTime() === today.getTime()) {
          stats.dueToday++;
        } else if (dueDate <= threeDaysFromNow) {
          stats.dueSoon++;
        }
      }
      
      // Sum progress for average
      totalProgress += (task.Progress || 0);
    });
    
    if (filteredTasks.length > 0) {
      stats.avgProgress = Math.round(totalProgress / filteredTasks.length);
    }
    
    return stats;
    
  } catch (error) {
    console.error('Error getting task statistics:', error);
    return {
      total: 0,
      byStatus: {},
      overdue: 0,
      dueToday: 0,
      dueSoon: 0,
      avgProgress: 0
    };
  }
}