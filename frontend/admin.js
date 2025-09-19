// admin.js - Admin Panel Module

/**
 * Admin Panel Management
 */
class AdminPanel {
    constructor() {
        this.tasks = [];
        this.employees = [];
        this.currentEditingTask = null;
        
        this.initializeEventListeners();
    }
    
    /**
     * Initialize event listeners for admin panel
     */
    initializeEventListeners() {
        // Add task form
        const addTaskForm = document.getElementById('addTaskForm');
        if (addTaskForm) {
            addTaskForm.addEventListener('submit', (e) => this.handleAddTask(e));
        }
        
        // Add employee form
        const addEmployeeForm = document.getElementById('addEmployeeForm');
        if (addEmployeeForm) {
            addEmployeeForm.addEventListener('submit', (e) => this.handleAddEmployee(e));
        }
    }
    
    /**
     * Load admin panel data
     */
    async loadAdminData() {
        try {
            showLoading(true);
            
            // Load employees and tasks in parallel
            const [employeesResult, tasksResult] = await Promise.all([
                api.Employee.getAll(),
                api.Task.getAll()
            ]);
            
            if (employeesResult && employeesResult.success) {
                this.employees = employeesResult.data || [];
            }
            
            if (tasksResult && tasksResult.success) {
                this.tasks = tasksResult.data || [];
            }
            
            // Update UI
            this.updateEmployeeSelect();
            this.updateEmployeeList();
            this.updateTasksTable();
            
            showLoading(false);
            
        } catch (error) {
            showLoading(false);
            console.error('Error loading admin data:', error);
            showError('Failed to load admin data. Please try again.');
        }
    }
    
    /**
     * Handle add task form submission
     */
    async handleAddTask(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const taskData = {
            description: formData.get('taskDescription') || document.getElementById('taskDescription').value,
            dueDate: formData.get('taskDueDate') || document.getElementById('taskDueDate').value,
            employeeId: formData.get('assignedEmployee') || document.getElementById('assignedEmployee').value,
            status: 'not_started',
            progress: 0,
            createdBy: getCurrentUser().employeeId,
            createdAt: new Date().toISOString()
        };
        
        // Validation
        if (!taskData.description.trim()) {
            showError('Task description is required');
            return;
        }
        
        if (!taskData.dueDate) {
            showError('Due date is required');
            return;
        }
        
        if (!taskData.employeeId) {
            showError('Please select an employee');
            return;
        }
        
        try {
            showLoading(true);
            
            const result = await api.Task.add(taskData);
            
            if (result && result.success) {
                showSuccess('Task added successfully');
                
                // Reset form
                event.target.reset();
                
                // Reload data
                await this.loadAdminData();
                
                // Clear cache
                api.clearCache('tasks');
                
            } else {
                throw new Error(result.error || 'Failed to add task');
            }
            
        } catch (error) {
            console.error('Error adding task:', error);
            showError('Failed to add task. Please try again.');
        } finally {
            showLoading(false);
        }
    }
    
    /**
     * Handle add employee form submission
     */
    async handleAddEmployee(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const employeeData = {
            name: formData.get('employeeName') || document.getElementById('employeeName').value,
            email: formData.get('employeeEmail') || document.getElementById('employeeEmail').value,
            role: formData.get('employeeRole') || document.getElementById('employeeRole').value,
            createdAt: new Date().toISOString()
        };
        
        // Validation
        if (!employeeData.name.trim()) {
            showError('Employee name is required');
            return;
        }
        
        if (!employeeData.email.trim()) {
            showError('Employee email is required');
            return;
        }
        
        if (!this.isValidEmail(employeeData.email)) {
            showError('Please enter a valid email address');
            return;
        }
        
        // Check if email already exists
        if (this.employees.some(emp => emp.email.toLowerCase() === employeeData.email.toLowerCase())) {
            showError('An employee with this email already exists');
            return;
        }
        
        try {
            showLoading(true);
            
            const result = await api.Employee.add(employeeData);
            
            if (result && result.success) {
                showSuccess('Employee added successfully');
                
                // Reset form
                event.target.reset();
                
                // Reload data
                await this.loadAdminData();
                
                // Clear cache
                api.clearCache('employees');
                
            } else {
                throw new Error(result.error || 'Failed to add employee');
            }
            
        } catch (error) {
            console.error('Error adding employee:', error);
            showError('Failed to add employee. Please try again.');
        } finally {
            showLoading(false);
        }
    }
    
    /**
     * Update employee select dropdown
     */
    updateEmployeeSelect() {
        const select = document.getElementById('assignedEmployee');
        if (!select) return;
        
        // Clear existing options (except placeholder)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        // Add employee options
        this.employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = `${employee.name} (${employee.email})`;
            select.appendChild(option);
        });
    }
    
    /**
     * Update employee list display
     */
    updateEmployeeList() {
        const container = document.getElementById('employeeList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.employees.length === 0) {
            container.innerHTML = '<p>No employees found. Add employees to get started.</p>';
            return;
        }
        
        this.employees.forEach(employee => {
            const employeeElement = this.createEmployeeElement(employee);
            container.appendChild(employeeElement);
        });
    }
    
    /**
     * Create employee list element
     */
    createEmployeeElement(employee) {
        const div = document.createElement('div');
        div.className = 'employee-item';
        
        div.innerHTML = `
            <div class="employee-info">
                <h4>${employee.name}</h4>
                <p>${employee.email} - ${this.formatRole(employee.role)}</p>
            </div>
            <div class="employee-actions">
                <button class="btn btn-sm btn-primary" onclick="adminPanel.editEmployee('${employee.id}')">
                    Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteEmployee('${employee.id}')">
                    Delete
                </button>
            </div>
        `;
        
        return div;
    }
    
    /**
     * Update admin tasks table
     */
    updateTasksTable() {
        const tableBody = document.getElementById('adminTasksTable');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (this.tasks.length === 0) {
            const row = tableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 6;
            cell.textContent = 'No tasks found';
            cell.style.textAlign = 'center';
            cell.style.padding = '2rem';
            cell.style.color = '#666';
            return;
        }
        
        this.tasks.forEach(task => {
            const row = this.createAdminTaskRow(task);
            tableBody.appendChild(row);
        });
    }
    
    /**
     * Create admin task table row
     */
    createAdminTaskRow(task) {
        const row = document.createElement('tr');
        
        const employee = this.employees.find(emp => emp.id === task.employeeId);
        const employeeName = employee ? employee.name : 'Unknown';
        
        row.innerHTML = `
            <td>${task.id}</td>
            <td>
                <div class="task-description">${this.truncateText(task.description, 40)}</div>
            </td>
            <td>${employeeName}</td>
            <td>${this.formatDate(task.dueDate)}</td>
            <td>
                <span class="status-badge status-${task.status}">
                    ${this.formatStatus(task.status)}
                </span>
            </td>
            <td>
                <div class="task-actions">
                    <button class="btn btn-sm btn-primary" onclick="adminPanel.editTask('${task.id}')">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteTask('${task.id}')">
                        Delete
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }
    
    /**
     * Edit task
     */
    async editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            showError('Task not found');
            return;
        }
        
        this.currentEditingTask = task;
        
        // Populate form with task data
        document.getElementById('taskDescription').value = task.description;
        document.getElementById('taskDueDate').value = task.dueDate.split('T')[0]; // Format date for input
        document.getElementById('assignedEmployee').value = task.employeeId;
        
        // Change form submit button text
        const submitBtn = document.querySelector('#addTaskForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Update Task';
            submitBtn.classList.remove('btn-primary');
            submitBtn.classList.add('btn-success');
        }
        
        // Add cancel button
        this.addCancelEditButton();
        
        // Scroll to form
        document.getElementById('addTaskForm').scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * Add cancel edit button
     */
    addCancelEditButton() {
        const form = document.getElementById('addTaskForm');
        let cancelBtn = document.getElementById('cancelEditBtn');
        
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.id = 'cancelEditBtn';
            cancelBtn.type = 'button';
            cancelBtn.className = 'btn btn-secondary mt-2';
            cancelBtn.textContent = 'Cancel Edit';
            cancelBtn.onclick = () => this.cancelEdit();
            
            form.appendChild(cancelBtn);
        }
    }
    
    /**
     * Cancel edit mode
     */
    cancelEdit() {
        this.currentEditingTask = null;
        
        // Reset form
        document.getElementById('addTaskForm').reset();
        
        // Reset submit button
        const submitBtn = document.querySelector('#addTaskForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Add Task';
            submitBtn.classList.remove('btn-success');
            submitBtn.classList.add('btn-primary');
        }
        
        // Remove cancel button
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.remove();
        }
    }
    
    /**
     * Update existing task
     */
    async updateTask() {
        if (!this.currentEditingTask) return;
        
        const taskData = {
            description: document.getElementById('taskDescription').value,
            dueDate: document.getElementById('taskDueDate').value,
            employeeId: document.getElementById('assignedEmployee').value,
            updatedAt: new Date().toISOString()
        };
        
        try {
            showLoading(true);
            
            const result = await api.Task.update(this.currentEditingTask.id, taskData);
            
            if (result && result.success) {
                showSuccess('Task updated successfully');
                this.cancelEdit();
                await this.loadAdminData();
                api.clearCache('tasks');
            } else {
                throw new Error(result.error || 'Failed to update task');
            }
            
        } catch (error) {
            console.error('Error updating task:', error);
            showError('Failed to update task. Please try again.');
        } finally {
            showLoading(false);
        }
    }
    
    /**
     * Delete task
     */
    async deleteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            showError('Task not found');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete the task "${task.description}"?`)) {
            return;
        }
        
        try {
            showLoading(true);
            
            const result = await api.Task.delete(taskId);
            
            if (result && result.success) {
                showSuccess('Task deleted successfully');
                await this.loadAdminData();
                api.clearCache('tasks');
            } else {
                throw new Error(result.error || 'Failed to delete task');
            }
            
        } catch (error) {
            console.error('Error deleting task:', error);
            showError('Failed to delete task. Please try again.');
        } finally {
            showLoading(false);
        }
    }
    
    /**
     * Edit employee
     */
    async editEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            showError('Employee not found');
            return;
        }
        
        // Show edit employee modal
        const modalHTML = `
            <form id="editEmployeeForm" class="employee-form">
                <div class="form-group">
                    <label for="editEmployeeName">Employee Name:</label>
                    <input type="text" id="editEmployeeName" class="form-control" value="${employee.name}" required>
                </div>
                <div class="form-group">
                    <label for="editEmployeeEmail">Employee Email:</label>
                    <input type="email" id="editEmployeeEmail" class="form-control" value="${employee.email}" required>
                </div>
                <div class="form-group">
                    <label for="editEmployeeRole">Role:</label>
                    <select id="editEmployeeRole" class="form-control" required>
                        <option value="employee" ${employee.role === 'employee' ? 'selected' : ''}>Employee</option>
                        <option value="supervisor" ${employee.role === 'supervisor' ? 'selected' : ''}>Supervisor</option>
                    </select>
                </div>
            </form>
        `;
        
        showModal('Edit Employee', modalHTML, [
            {
                text: 'Cancel',
                class: 'btn-secondary',
                onclick: 'closeModal()'
            },
            {
                text: 'Update',
                class: 'btn-primary',
                onclick: `adminPanel.updateEmployee('${employeeId}')`
            }
        ]);
    }
    
    /**
     * Update employee
     */
    async updateEmployee(employeeId) {
        const employeeData = {
            name: document.getElementById('editEmployeeName').value,
            email: document.getElementById('editEmployeeEmail').value,
            role: document.getElementById('editEmployeeRole').value,
            updatedAt: new Date().toISOString()
        };
        
        // Validation
        if (!employeeData.name.trim()) {
            showError('Employee name is required');
            return;
        }
        
        if (!this.isValidEmail(employeeData.email)) {
            showError('Please enter a valid email address');
            return;
        }
        
        try {
            showLoading(true);
            
            const result = await api.Employee.update(employeeId, employeeData);
            
            if (result && result.success) {
                showSuccess('Employee updated successfully');
                closeModal();
                await this.loadAdminData();
                api.clearCache('employees');
            } else {
                throw new Error(result.error || 'Failed to update employee');
            }
            
        } catch (error) {
            console.error('Error updating employee:', error);
            showError('Failed to update employee. Please try again.');
        } finally {
            showLoading(false);
        }
    }
    
    /**
     * Delete employee
     */
    async deleteEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            showError('Employee not found');
            return;
        }
        
        // Check if employee has assigned tasks
        const assignedTasks = this.tasks.filter(task => task.employeeId === employeeId);
        
        let confirmMessage = `Are you sure you want to delete employee "${employee.name}"?`;
        if (assignedTasks.length > 0) {
            confirmMessage += `\n\nThis employee has ${assignedTasks.length} assigned task(s). These tasks will need to be reassigned.`;
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            showLoading(true);
            
            const result = await api.Employee.delete(employeeId);
            
            if (result && result.success) {
                showSuccess('Employee deleted successfully');
                await this.loadAdminData();
                api.clearCache('employees');
            } else {
                throw new Error(result.error || 'Failed to delete employee');
            }
            
        } catch (error) {
            console.error('Error deleting employee:', error);
            showError('Failed to delete employee. Please try again.');
        } finally {
            showLoading(false);
        }
    }
    
    /**
     * Utility Functions
     */
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    formatDate(dateString) {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
    
    formatStatus(status) {
        const statusMap = {
            'not_started': 'Not Started',
            'in_progress': 'In Progress',
            'completed': 'Completed'
        };
        return statusMap[status] || status;
    }
    
    formatRole(role) {
        const roleMap = {
            'employee': 'Employee',
            'supervisor': 'Supervisor',
            'admin': 'Administrator'
        };
        return roleMap[role] || role;
    }
}

// Initialize admin panel
let adminPanel = null;

/**
 * Initialize admin panel when screen is shown
 */
function initAdminPanel() {
    if (!adminPanel) {
        adminPanel = new AdminPanel();
    }
    adminPanel.loadAdminData();
}

// Export for global access
window.adminPanel = adminPanel;
window.initAdminPanel = initAdminPanel;