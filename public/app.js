let currentUser = null;
let currentToken = null;

const isMobile = () => window.innerWidth <= 768;

function showLoader(containerId, message = 'Fetching data...') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loader-container">
                <div class="loader"></div>
                <p>${message}</p>
            </div>
        `;
    }
}

async function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const uid = document.getElementById('uid').value.trim();
    const errorDiv = document.getElementById('login-error');

    const loginBtn = document.querySelector('#login-page button');
    const originalText = loginBtn.textContent;

    if (!username || !password) {
        errorDiv.textContent = 'Credentials required';
        return;
    }

    errorDiv.textContent = '';
    loginBtn.classList.add('loading');
    loginBtn.textContent = 'Authenticating';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, uid })
        });

        const data = await response.json();

        if (response.ok) {
            loginBtn.style.background = 'var(--accent-green)';
            loginBtn.textContent = 'Success';

            currentToken = data.token;
            currentUser = data.user;
            localStorage.setItem('abi_token', currentToken);

            setTimeout(() => {
                showDashboard();
                loginBtn.classList.remove('loading');
                loginBtn.style.background = '';
                loginBtn.textContent = originalText;
            }, 600);
        } else {
            errorDiv.textContent = data.message;
            loginBtn.classList.remove('loading');
            loginBtn.textContent = originalText;
        }
    } catch (err) {
        errorDiv.textContent = 'Connection error';
        loginBtn.classList.remove('loading');
        loginBtn.textContent = originalText;
    }
}

function showDashboard() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('dashboard').classList.add('active');
    showTab('attendance');
}

function handleLogout() {
    currentUser = null;
    currentToken = null;
    localStorage.removeItem('abi_token');
    document.getElementById('dashboard').classList.remove('active');
    document.getElementById('login-page').classList.add('active');
}

function showTab(tab) {
    const searchStr = tab.toLowerCase();

    // Update Bottom Nav
    document.querySelectorAll('.bottom-nav-link').forEach(link => {
        const spanText = link.querySelector('span:not(.material-symbols-rounded)')?.textContent || '';
        link.classList.toggle('active', spanText.toLowerCase() === searchStr);
    });

    // Update Sidebar Links
    document.querySelectorAll('.sidebar-link').forEach(link => {
        const spanText = link.querySelector('span:not(.material-symbols-rounded)')?.textContent || '';
        link.classList.toggle('active', spanText.toLowerCase() === searchStr);
    });

    const content = document.getElementById('tab-content');
    content.style.opacity = '0';
    content.style.transform = 'translateY(15px)';

    setTimeout(() => {
        showLoader('tab-content', `Initializing ${tab}...`);

        if (tab === 'attendance') renderAttendance();
        if (tab === 'students') renderStudents();
        if (tab === 'analytics') renderAnalytics();
        if (tab === 'admin') renderAdmin();

        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Re-enable animation
        requestAnimationFrame(() => {
            content.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        });
    }, 200);
}

/* --- Tab Renderers --- */

async function renderAttendance() {
    const content = document.getElementById('tab-content');
    content.innerHTML = `
        <div class="tab-header">
            <h2>Attendance</h2>
            <p>Smart verification & tracking</p>
        </div>
        
        <select id="section-select" onchange="loadStudentsForAttendance()">
            <option value="">Select Target Section</option>
            <option value="1st Year DAIML">1st Year DAIML</option>
            <option value="2nd Year DAIML">2nd Year DAIML</option>
            <option value="3rd Year DAIML">3rd Year DAIML</option>
        </select>
        
        <div id="attendance-summary"></div>
        <div id="attendance-list"></div>
    `;
}

async function loadStudentsForAttendance() {
    const section = document.getElementById('section-select').value;
    if (!section) return;

    showLoader('attendance-list', 'Syncing student database...');

    try {
        const response = await fetch(`/api/students?section=${section}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const students = await response.json();
        const listDiv = document.getElementById('attendance-list');

        listDiv.innerHTML = `
            ${students.map((s, i) => `
                <div class="mobile-card" style="animation-delay: ${i * 0.05}s">
                    <div class="card-header">
                        <div>
                            <div class="card-title">${s.name}</div>
                            <div class="card-subtitle">${s.register_number}</div>
                        </div>
                        <div class="card-subtitle">#${i + 1}</div>
                    </div>
                    
                    <div class="attendance-toggle">
                        <label class="toggle-option">
                            <input type="radio" name="status-${s.id}" value="PRESENT" onchange="updateCount()">
                            <span class="toggle-label present">PRESENT</span>
                        </label>
                        <label class="toggle-option">
                            <input type="radio" name="status-${s.id}" value="ABSENT" onchange="updateCount()">
                            <span class="toggle-label absent">ABSENT</span>
                        </label>
                    </div>
                </div>
            `).join('')}
            
            <button id="submit-btn" onclick="confirmAttendance('${section}')" style="margin-top: 1rem; padding: 20px;">
                Finalize Attendance
            </button>
        `;
        updateCount();
    } catch (err) {
        document.getElementById('attendance-list').innerHTML = '<p class="error-msg">Failed to load students.</p>';
    }
}

function updateCount() {
    const cards = document.querySelectorAll('.mobile-card');
    const total = cards.length;
    const present = document.querySelectorAll('input[value="PRESENT"]:checked').length;
    const absent = document.querySelectorAll('input[value="ABSENT"]:checked').length;

    const summaryDiv = document.getElementById('attendance-summary');
    if (total === 0) {
        summaryDiv.innerHTML = '';
        return;
    }

    summaryDiv.innerHTML = `
        <div class="summary-grid">
            <div class="summary-item">
                <span class="summary-val">${total}</span>
                <span class="summary-label">Total</span>
            </div>
            <div class="summary-item" style="color: var(--accent-green)">
                <span class="summary-val">${present}</span>
                <span class="summary-label">Present</span>
            </div>
            <div class="summary-item" style="color: var(--accent-red)">
                <span class="summary-val">${absent}</span>
                <span class="summary-label">Absent</span>
            </div>
        </div>
    `;
}

async function confirmAttendance(section) {
    const cards = document.querySelectorAll('.mobile-card');
    const records = [];
    const absentees = [];

    cards.forEach(card => {
        const input = card.querySelector('input');
        const studentId = input.name.replace('status-', '');
        const checkedInput = card.querySelector('input:checked');
        const status = checkedInput?.value;

        if (status) {
            records.push({ student_id: studentId, status });
            if (status === 'ABSENT') {
                const name = card.querySelector('.card-title').textContent.trim();
                const reg = card.querySelector('.card-subtitle').textContent.trim();
                absentees.push({ name, reg });
            }
        }
    });

    if (records.length < cards.length) {
        alert('Action Required: Please mark attendance for all students before submission.');
        return;
    }

    const btn = document.getElementById('submit-btn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ records, section })
        });

        const data = await response.json();
        if (response.ok) {
            if (data.whatsappUrl) {
                if (confirm('Success: Attendance logged. Open WhatsApp to share the absentee list?')) {
                    window.open(data.whatsappUrl, '_blank');
                }
            } else {
                alert('Success: Attendance securely logged and processed.');
            }

            showTab('attendance');
        } else {
            alert('Error: ' + data.message);
        }
    } catch (err) {
        alert('Network Failure: Could not reach the server.');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

function renderStudents() {
    const content = document.getElementById('tab-content');
    content.innerHTML = `
        <div class="tab-header">
            <h2>Students</h2>
            <p>Database Management</p>
        </div>

        <div class="management-card">
            <h4><span class="material-symbols-rounded">person_add</span> Manual Setup</h4>
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="s-name" placeholder="Name">
            </div>
            <div class="form-group">
                <label>Register Number</label>
                <input type="text" id="s-reg" placeholder="Reg No">
            </div>
            <div class="form-group">
                <label>Assigned Section</label>
                <select id="section-select-add">
                    <option value="1st Year DAIML">1st Year DAIML</option>
                    <option value="2nd Year DAIML">2nd Year DAIML</option>
                    <option value="3rd Year DAIML">3rd Year DAIML</option>
                </select>
            </div>
            <button onclick="addStudentManual()">Register Student</button>
        </div>

        <div class="management-card">
            <h4><span class="material-symbols-rounded">upload_file</span> Bulk Import</h4>
            <p class="card-subtitle" style="margin-bottom: 1rem;">Supports .xlsx or .xls files</p>
            <div class="caution-box">
                <span class="material-symbols-rounded">info</span>
                <p>Required Columns: "Student Name" & "Register Number"</p>
            </div>
            <div class="form-group">
                <label>Target Section</label>
                <select id="section-select-manage">
                    <option value="1st Year DAIML">1st Year DAIML</option>
                    <option value="2nd Year DAIML">2nd Year DAIML</option>
                    <option value="3rd Year DAIML">3rd Year DAIML</option>
                </select>
            </div>
            <input type="file" id="excel-file" accept=".xlsx, .xls" style="margin-bottom: 1rem;">
            <button class="btn-secondary" onclick="uploadExcel()">Execute Import</button>
        </div>

        <div class="tab-header" style="margin-top: 3rem;">
            <h3>Registry Browser</h3>
        </div>
        
        <select id="section-view-manage" onchange="loadStudentsForManagement()">
            <option value="">Select Section to Browse</option>
            <option value="1st Year DAIML">1st Year DAIML</option>
            <option value="2nd Year DAIML">2nd Year DAIML</option>
            <option value="3rd Year DAIML">3rd Year DAIML</option>
        </select>
        
        <div id="student-manage-list"></div>
    `;
}

async function loadStudentsForManagement() {
    const section = document.getElementById('section-view-manage').value;
    const container = document.getElementById('student-manage-list');
    if (!section) return;

    showLoader('student-manage-list', 'Querying student records...');

    try {
        const response = await fetch(`/api/students?section=${section}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const students = await response.json();

        if (students.length === 0) {
            container.innerHTML = '<div class="loader-container"><p>No records found in this section.</p></div>';
            return;
        }

        container.innerHTML = students.map((s, i) => `
            <div class="mobile-card" style="animation-delay: ${i * 0.05}s">
                <div class="card-header">
                    <div>
                        <div class="card-title">${s.name}</div>
                        <div class="card-subtitle">Reg: ${s.register_number}</div>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-sm btn-danger" onclick="deleteStudent('${s.id}', '${s.name}')">
                        Remove Record
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = '<p class="error-msg">Failed to query database.</p>';
    }
}

async function deleteStudent(id, name) {
    if (!confirm(`Warning: You are about to delete record for ${name}. Continue?`)) return;

    try {
        const response = await fetch(`/api/students/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            loadStudentsForManagement();
        } else {
            alert('Operation Denied');
        }
    } catch (err) {
        alert('Integration Error');
    }
}

async function uploadExcel() {
    const fileInput = document.getElementById('excel-file');
    const section = document.getElementById('section-select-manage')?.value;

    if (!fileInput.files[0] || !section) {
        alert('Please select a file and section');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('section', section);

    try {
        const response = await fetch('/api/students/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });

        const data = await response.json();
        if (response.ok) {
            alert(`Import Successful: ${data.count} records added.`);
            showTab('students');
        } else {
            alert('Import Failed: ' + data.message);
        }
    } catch (err) {
        alert('Terminal Error');
    }
}

async function addStudentManual() {
    const name = document.getElementById('s-name').value;
    const register_number = document.getElementById('s-reg').value;
    const section = document.getElementById('section-select-add').value;

    if (!name || !register_number) {
        alert('Incomplete Data: Please fill all required fields.');
        return;
    }

    try {
        const response = await fetch('/api/students/manual', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ name, register_number, section })
        });

        if (response.ok) {
            alert('Student added successfully');
            showTab('students');
        }
    } catch (err) {
        alert('Server unreachable');
    }
}

// Attendance chart instance
let attendanceChart = null;


function renderAnalytics() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tab-content').innerHTML = `
        <div class="tab-header">
            <h2>Analytics</h2>
            <p>Performance & Insights</p>
        </div>

        <div class="management-card">
            <div class="form-group">
                <label>Choose Section</label>
                <select id="section-select-analytics">
                    <option value="">All Regions</option>
                    <option value="1st Year DAIML">1st Year DAIML</option>
                    <option value="2nd Year DAIML">2nd Year DAIML</option>
                    <option value="3rd Year DAIML">3rd Year DAIML</option>
                </select>
            </div>
            <div class="date-range-grid">
                <div class="form-group">
                    <label>From</label>
                    <input type="date" id="start-date" value="${today}">
                </div>
                <div class="form-group">
                    <label>To</label>
                    <input type="date" id="end-date" value="${today}">
                </div>
            </div>
            <button onclick="fetchAndDisplayReport()">Generate Insights</button>
            <button class="btn-secondary" style="margin-top: 1rem;" onclick="downloadReport()">Download CSV/Excel</button>
        </div>

        <div id="chart-section" class="chart-container" style="display: none; border: none; box-shadow: var(--card-shadow); padding: 1.5rem; margin-top: 2rem;">
            <canvas id="attendanceChart"></canvas>
        </div>

        <div id="report-container" style="margin-top: 2rem;"></div>
    `;
}

async function fetchAndDisplayReport() {
    const section = document.getElementById('section-select-analytics').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const container = document.getElementById('report-container');

    showLoader('report-container', 'Compiling analytics report...');

    try {
        const url = `/api/attendance/analytics?section=${section}&startDate=${startDate}&endDate=${endDate}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await response.json();

        if (data.length === 0) {
            container.innerHTML = '<div class="loader-container"><p>No activity detected for this range.</p></div>';
            return;
        }

        const dates = [...new Set(data.map(r => r.attendance_date))].sort();
        const students = {};
        data.forEach(r => {
            if (!students[r.student_id]) students[r.student_id] = { name: r.student?.name || 'Unknown', logs: {} };
            students[r.student_id].logs[r.attendance_date] = r.status;
        });

        const sortedStudents = Object.values(students).sort((a, b) => a.name.localeCompare(b.name));

        container.innerHTML = `
            <div class="matrix-container">
                <table class="matrix-table">
                    <thead>
                        <tr>
                            <th style="min-width: 140px; text-align: left; padding: 10px;">NAME</th>
                            ${dates.map(d => `<th class="date-col">${d.split('-').slice(1).join('/')}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedStudents.map(s => `
                            <tr>
                                <td style="font-size: 0.8rem; font-weight: 700; padding: 10px;">${s.name}</td>
                                ${dates.map(d => {
            const st = s.logs[d];
            const cls = st === 'PRESENT' ? 'present' : (st === 'ABSENT' ? 'absent' : '');
            return `<td class="matrix-cell ${cls}">${st ? st[0] : '-'}</td>`;
        }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('chart-section').style.display = 'block';
        renderAttendanceChart(dates, data);
    } catch (err) {
        container.innerHTML = '<p class="error-msg">Report Generation Failed.</p>';
    }
}


function renderAttendanceChart(dates, data) {
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    if (attendanceChart) attendanceChart.destroy();

    const chartStats = dates.map(d => {
        const dayData = data.filter(r => r.attendance_date === d);
        return {
            date: d,
            present: dayData.filter(r => r.status === 'PRESENT').length,
            absent: dayData.filter(r => r.status === 'ABSENT').length
        };
    });

    attendanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates.map(d => d.split('-').slice(1).join('/')),
            datasets: [
                { label: 'P', data: chartStats.map(s => s.present), backgroundColor: '#10b981', borderRadius: 6 },
                { label: 'A', data: chartStats.map(s => s.absent), backgroundColor: '#ef4444', borderRadius: 6 }
            ]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
        }
    });
}

async function downloadReport() {
    const section = document.getElementById('section-select-analytics').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    window.open(`/api/attendance/report?section=${section}&startDate=${startDate}&endDate=${endDate}&token=${currentToken}`, '_blank');
}

function renderAdmin() {
    if (currentUser?.role !== 'ADMIN') {
        document.getElementById('tab-content').innerHTML = `
            <div class="loader-container">
                <span class="material-symbols-rounded" style="font-size: 4rem; color: var(--accent-red);">lock</span>
                <p>Security Clearance Required</p>
            </div>
        `;
        return;
    }

    document.getElementById('tab-content').innerHTML = `
        <div class="tab-header">
            <h2>Admin</h2>
            <p>Security & Access Control</p>
        </div>

        <div class="management-card">
            <h4>Authorize New User</h4>
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="new-username" placeholder="Username">
            </div>
            <div class="form-group">
                <label>Security Key</label>
                <input type="password" id="new-password" placeholder="Password">
            </div>
            <div class="form-group">
                <label>Role</label>
                <select id="new-role">
                    <option value="STAFF">Security Staff</option>
                    <option value="ADMIN">Administrator</option>
                </select>
            </div>
            <div class="form-group">
                <label>UID (Optional)</label>
                <input type="text" id="new-uid" placeholder="Auto-generated if empty">
            </div>
            <button onclick="createNewUser()">Grant Access</button>
        </div>

        <div id="user-list-container" style="margin-top: 2rem;"></div>
    `;
    loadUsers();
}

async function loadUsers() {
    const container = document.getElementById('user-list-container');
    showLoader('user-list-container', 'Scanning authorized accounts...');

    try {
        const response = await fetch('/api/auth/users', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const users = await response.json();

        container.innerHTML = users.map(u => `
            <div class="mobile-card">
                <div class="card-header">
                    <div>
                        <div class="card-title">${u.username}</div>
                        <div class="card-subtitle">${u.role}</div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-row">
                        <span class="card-label">UID</span>
                        <span class="card-value">${u.uid}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-sm btn-secondary" onclick="changePassword('${u.id}')">Reset Key</button>
                    ${u.username !== currentUser.username ? `
                        <button class="btn-sm btn-danger" onclick="deleteUser('${u.id}')">Revoke</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = '<p class="error-msg">Failed to scan users.</p>';
    }
}

async function changePassword(id) {
    const newPass = prompt('Enter new system key:');
    if (!newPass) return;

    try {
        await fetch(`/api/auth/users/${id}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ password: newPass })
        });
        alert('Key updated.');
    } catch (err) {
        alert('Integration Failed');
    }
}

async function deleteUser(id) {
    if (!confirm('Permanent Revocation: Continue?')) return;
    try {
        await fetch(`/api/auth/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        loadUsers();
    } catch (err) {
        alert('Link Error');
    }
}

async function createNewUser() {
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;
    const role = document.getElementById('new-role').value;
    const uid = document.getElementById('new-uid').value;

    if (!username || !password) return alert('Credentials Required');

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ username, password, role, uid })
        });

        if (response.ok) {
            alert('Access Granted');
            renderAdmin();
        }
    } catch (err) {
        alert('Authorization Failed');
    }
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
    // Force manual login as per user request
    const token = localStorage.getItem('abi_token');
    if (token) {
        currentToken = token;
        // Skip automatic dashboard redirect to start at login page
        // showDashboard(); 
    }
});
