// employee.js - Employee Task Management Module

/**
 * Employee Task Management
 */
class EmployeeTaskManager {
    constructor() {
        this.tasks = [];
        this.currentUser = null;
        this.refreshInterval = null;
        
        this.initializeEventListeners();
    }
    
    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Task progress slider
        const progressSlider = document.getElementById('modalTaskProgress');
        if (progressSlider) {
            progressSlider.addEventListener('input', (e) => {
                document.getElementById('progressValue').textContent = e.target.value + '%';
            });
        }
    }
    
    /**
     * Load employee tasks
     */
    async loadEmployeeTasks() {
        try {
            this.currentUser = getCurrentUser();
            if (!this.currentUser) {
                throw new Error('User not authenticated');
            }
            
            // Get employee ID - try cached first, then API call
            let employeeId = this.currentUser.employeeId;
            
            // If we don't have employeeId, try to get it from the backend
            if (!employeeId) {
                try {
                    const userRoleResult = await api.call('getUserRole', { email: this.currentUser.email });
                    if (userRoleResult && userRoleResult.success && userRoleResult.data) {
                        employeeId = userRoleResult.data.userId;
                        this.currentUser.employeeId = employeeId; // Cache it
                    }
                } catch (error) {
                    console.warn('Could not get user employee ID:', error);
                    throw new Error('Unable to determine your employee ID. Please contact support.');
                }
            }
            
            if (!employeeId) {
                throw new Error('Unable to determine your employee ID. Please contact support.');
            }
            
            showLoading(true);
            
            const result = await api.Task.getByEmployee(employeeId);
            
            if (result && result.success) {
                this.tasks = result.data || [];
                this.updateTaskStatistics();
                this.updateTasksList();
            } else {
                throw new Error(result.error || 'Failed to load tasks');
            }
            
            showLoading(false);
            
        } catch (error) {
            showLoading(false);
            console.error('Error loading employee tasks:', error);
            showError('Failed to load your tasks. Please try again.');
        }
    }
    
    /**
     * Update task statistics
     */
    updateTaskStatistics() {
        const assignedTasks = this.tasks.length;
        const inProgressTasks = this.tasks.filter(task => task.status === 'in_progress').length;
        const completedTasks = this.tasks.filter(task => task.status === 'completed').length;
        
        this.updateElement('myAssignedTasks', assignedTasks);
        this.updateElement('myInProgressTasks', inProgressTasks);
        this.updateElement('myCompletedTasks', completedTasks);
    }
    
    /**
     * Update tasks list display
     */
    updateTasksList() {
        const container = document.getElementById('myTasksList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.tasks.length === 0) {
            container.innerHTML = `
                <div class="no-tasks">
                    <h3>No tasks assigned yet</h3>
                    <p>You don't have any tasks assigned at the moment. Check back later or contact your supervisor.</p>
                </div>
            `;
            return;
        }
        
        // Sort tasks: incomplete first, then by due date
        const sortedTasks = this.tasks.sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (a.status !== 'completed' && b.status === 'completed') return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
        
        sortedTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            container.appendChild(taskElement);
        });
    }
    
    /**
     * Create task element
     */
    createTaskElement(task) {
        const div = document.createElement('div');
        div.className = 'task-item';
        div.onclick = () => this.openTaskModal(task);
        
        // Add classes for visual indicators
        if (task.status === 'completed') {
            div.classList.add('task-completed');
        } else if (this.isTaskOverdue(task)) {
            div.classList.add('task-overdue');
        } else if (this.isTaskDueSoon(task)) {
            div.classList.add('task-due-soon');
        }
        
        div.innerHTML = `
            <div class="task-header">
                <div>
                    <div class="task-title">${task.description}</div>
                    <div class="task-due-date">
                        ${this.getDueDateText(task)}
                    </div>
                </div>
                <div class="task-status">
                    <span class="status-badge status-${task.status}">
                        ${this.formatStatus(task.status)}
                    </span>
                </div>
            </div>
            <div class="task-progress">
                <div class="task-progress-label">
                    <span>Progress</span>
                    <span>${task.progress || 0}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${task.progress || 0}%"></div>
                </div>
            </div>
            ${task.lastUpdate ? `
                <div class="task-last-update">
                    Last updated: ${this.formatDateTime(task.lastUpdate)}
                </div>
            ` : ''}
        `;
        
        return div;
    }
    
    /**
     * Open task details modal
     */
    async openTaskModal(task) {
        try {
            // Load progress history
            const progressResult = await api.Progress.getByTask(task.id);
            const progressHistory = progressResult.success ? progressResult.data : [];
            
            // Populate modal with task data
            document.getElementById('modalTitle').textContent = 'Task Details';
            document.getElementById('modalTaskDescription').value = task.description;
            document.getElementById('modalTaskDescription').readOnly = true;
            document.getElementById('modalTaskProgress').value = task.progress || 0;
            document.getElementById('progressValue').textContent = (task.progress || 0) + '%';
            document.getElementById('modalTaskStatus').value = task.status;
            document.getElementById('modalTaskNotes').value = '';
            
            // Store current task
            this.currentEditingTask = task;
            
            // Show modal
            document.getElementById('taskModal').style.display = 'block';
            
        } catch (error) {
            console.error('Error opening task modal:', error);
            showError('Failed to load task details');
        }
    }
    
    /**
     * Save task details from modal
     */
    async saveTaskDetails() {
        if (!this.currentEditingTask) {
            showError('No task selected');
            return;
        }
        
        const progress = parseInt(document.getElementById('modalTaskProgress').value);
        const status = document.getElementById('modalTaskStatus').value;
        const notes = document.getElementById('modalTaskNotes').value.trim();
        
        // Validation
        if (status === 'completed' && progress < 100) {
            if (!confirm('Task is marked as completed but progress is less than 100%. Continue?')) {
                return;
            }
        }
        
        const updateData = {
            progress: progress,
            status: status,
            lastUpdate: new Date().toISOString()
        };
        
        // If progress changed significantly or notes added, create progress entry
        const shouldCreateProgressEntry = 
            Math.abs((this.currentEditingTask.progress || 0) - progress) >= 5 || 
            notes || 
            this.currentEditingTask.status !== status;
        
        try {
            showLoading(true);
            
            // Update task
            const taskResult = await api.Task.update(this.currentEditingTask.id, updateData);
            
            if (!taskResult || !taskResult.success) {
                throw new Error(taskResult.error || 'Failed to update task');
            }
            
            // Add progress entry if needed
            if (shouldCreateProgressEntry) {
                const progressData = {
                    taskId: this.currentEditingTask.id,
                    employeeId: this.currentUser.employeeId,
                    progress: progress,
                    notes: notes,
                    status: status,
                    createdAt: new Date().toISOString()
                };
                
                const progressResult = await api.Progress.add(progressData);
                
                if (!progressResult || !progressResult.success) {
                    console.warn('Failed to create progress entry:', progressResult.error);
                }
            }
            
            showSuccess('Task updated successfully');
            
            // Close modal
            this.closeTaskModal();
            
            // Reload tasks
            await this.loadEmployeeTasks();
            
            // Clear cache
            api.clearCache('tasks');
            
        } catch (error) {
            console.error('Error saving task details:', error);
            showError('Failed to update task. Please try again.');
        } finally {
            showLoading(false);
        }
    }
    
    /**
     * Close task modal
     */
    closeTaskModal() {
        document.getElementById('taskModal').style.display = 'none';
        this.currentEditingTask = null;
    }
    
    /**
     * Get due date text with appropriate styling
     */
    getDueDateText(task) {
        if (!task.dueDate) return 'No due date';
        
        const dueDate = new Date(task.dueDate);
        const now = new Date();
        const diffTime = dueDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let text = `Due: ${this.formatDate(task.dueDate)}`;
        let className = '';
        
        if (task.status === 'completed') {
            className = 'due-completed';
        } else if (diffDays < 0) {
            text += ` (${Math.abs(diffDays)} days overdue)`;
            className = 'due-overdue';
        } else if (diffDays === 0) {
            text += ' (Due today)';
            className = 'due-today';
        } else if (diffDays <= 3) {
            text += ` (${diffDays} days left)`;
            className = 'due-soon';
        } else {
            text += ` (${diffDays} days left)`;
            className = 'due-normal';
        }
        
        return `<span class="${className}">${text}</span>`;
    }
    
    /**
     * Check if task is overdue
     */
    isTaskOverdue(task) {
        if (!task.dueDate || task.status === 'completed') return false;
        return new Date(task.dueDate) < new Date();
    }
    
    /**
     * Check if task is due soon (within 3 days)
     */
    isTaskDueSoon(task) {
        if (!task.dueDate || task.status === 'completed') return false;
        const dueDate = new Date(task.dueDate);
        const now = new Date();
        const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 3;
    }
    
    /**
     * Filter tasks by status
     */
    filterTasks(status) {
        const filteredTasks = status ? this.tasks.filter(task => task.status === status) : this.tasks;
        
        const container = document.getElementById('myTasksList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (filteredTasks.length === 0) {
            container.innerHTML = `
                <div class="no-tasks">
                    <h3>No ${status ? this.formatStatus(status).toLowerCase() : ''} tasks</h3>
                    <p>You don't have any ${status ? this.formatStatus(status).toLowerCase() : ''} tasks at the moment.</p>
                </div>
            `;
            return;
        }
        
        filteredTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            container.appendChild(taskElement);
        });
    }
    
    /**
     * Start auto-refresh
     */
    startAutoRefresh(intervalMinutes = 10) {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            this.loadEmployeeTasks();
        }, intervalMinutes * 60 * 1000);
    }
    
    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
    
    /**
     * Export tasks to CSV
     */
    exportMyTasks() {
        const csvData = this.tasks.map(task => ({
            'Task': task.description,
            'Due Date': this.formatDate(task.dueDate),
            'Status': this.formatStatus(task.status),
            'Progress': `${task.progress || 0}%`,
            'Last Updated': this.formatDateTime(task.lastUpdate)
        }));
        
        this.downloadCSV(csvData, 'my_tasks.csv');
    }
    
    downloadCSV(data, filename) {
        if (data.length === 0) {
            showError('No data to export');
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => 
                `"${String(row[header]).replace(/"/g, '""')}"`
            ).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
    
    /**
     * Utility Functions
     */
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    formatDate(dateString) {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
    
    formatDateTime(dateString) {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleString();
    }
    
    formatStatus(status) {
        const statusMap = {
            'not_started': 'Not Started',
            'in_progress': 'In Progress',
            'completed': 'Completed'
        };
        return statusMap[status] || status;
    }
}

// Initialize employee task manager
let employeeTaskManager = null;

/**
 * Initialize employee task manager when screen is shown
 */
function initEmployeeTaskManager() {
    if (!employeeTaskManager) {
        employeeTaskManager = new EmployeeTaskManager();
    }
    employeeTaskManager.loadEmployeeTasks();
    employeeTaskManager.startAutoRefresh();
}

/**
 * Cleanup employee task manager
 */
function cleanupEmployeeTaskManager() {
    if (employeeTaskManager) {
        employeeTaskManager.stopAutoRefresh();
    }
}

/**
 * Save task details (called from modal)
 */
function saveTaskDetails() {
    if (employeeTaskManager) {
        employeeTaskManager.saveTaskDetails();
    }
}

/**
 * Close modal (called from modal)
 */
function closeModal() {
    if (employeeTaskManager) {
        employeeTaskManager.closeTaskModal();
    }
}

// Export for global access
window.employeeTaskManager = employeeTaskManager;
window.initEmployeeTaskManager = initEmployeeTaskManager;
window.cleanupEmployeeTaskManager = cleanupEmployeeTaskManager;
window.saveTaskDetails = saveTaskDetails;
window.closeModal = closeModal;