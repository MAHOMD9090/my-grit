// التهيئة المتقدمة للبيانات - تبدأ الآن فارغة تماماً والستريك صفر بناءً على طلبك
let state = {
    tasks: JSON.parse(localStorage.getItem('grit_tasks')) || [],
    goals: JSON.parse(localStorage.getItem('grit_goals')) || [],
    achievements: JSON.parse(localStorage.getItem('grit_achievements')) || [
        { id: 'first_task', title: 'First Blood', desc: 'Complete your initial daily objective.', unlocked: false },
        { id: 'clean_sheet', title: 'Flawless Execution', desc: 'Clear all tasks in a single day.', unlocked: false },
        { id: 'milestone_crushed', title: 'Apex Achiever', desc: 'Complete a long-term metric goal.', unlocked: false }
    ],
    streak: parseInt(localStorage.getItem('grit_streak')) || 0,
    gritScore: parseInt(localStorage.getItem('grit_gritScore')) || 0
};

let chartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    renderAll();
    initChart();
});

// الحفظ المنظم للبيانات في الذاكرة المحلية كطبقة حماية أساسية للتطبيق
function saveState() {
    localStorage.setItem('grit_tasks', JSON.stringify(state.tasks));
    localStorage.setItem('grit_goals', JSON.stringify(state.goals));
    localStorage.setItem('grit_achievements', JSON.stringify(state.achievements));
    localStorage.setItem('grit_streak', state.streak);
    localStorage.setItem('grit_gritScore', state.gritScore);
}

// 💾 وظيفة تصدير البيانات إلى ملف خارجي JSON لتحميله على الهاتف أو الكمبيوتر
function exportDataToFile() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "grit_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification("Backup Downloaded", "Your external data file has been securely saved.");
}

// 📂 وظيفة استيراد الملف الخارجي وقراءته لتشغيل التطبيق بكفاءة على GitHub Pages
function importDataFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedState = JSON.parse(e.target.result);
            if (importedState.hasOwnProperty('tasks') && importedState.hasOwnProperty('goals')) {
                state = importedState;
                saveState();
                renderAll();
                initChart();
                showNotification("Import Successful", "All data synchronized perfectly.");
            } else {
                showNotification("Invalid File", "This file is not a valid Grit backup.");
            }
        } catch (err) {
            showNotification("Parsing Error", "Could not process the uploaded data file.");
        }
    };
    reader.readAsText(file);
}

// التبديل بين الشاشات
function switchView(viewId, element) {
    document.querySelectorAll('.view-panel').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.tab-bar .tab-item').forEach(tab => tab.classList.remove('active'));
    
    document.getElementById(`view-${viewId}`).classList.add('active');
    if(element) element.classList.add('active');

    if(viewId === 'analytics') {
        setTimeout(initChart, 50);
    }
}

// فتح نوافذ الإدخال المنبثقة
function openModal(type) {
    const overlay = document.getElementById('inputModal');
    document.getElementById('entryType').value = type;
    
    if(type === 'task') {
        document.getElementById('modalTitle').innerText = 'Add Protocol Task';
        document.getElementById('inputLabelName').innerText = 'Task Objective';
        document.getElementById('itemName').placeholder = 'e.g., Hit the weight room';
        document.getElementById('targetValueGroup').style.display = 'none';
    } else {
        document.getElementById('modalTitle').innerText = 'Establish Milestone Goal';
        document.getElementById('inputLabelName').innerText = 'Goal Destination';
        document.getElementById('itemName').placeholder = 'e.g., Save $5000 or Read Books';
        document.getElementById('targetValueGroup').style.display = 'block';
    }
    overlay.classList.add('open');
}

function closeModal(e) {
    if(!e || e.target === document.getElementById('inputModal') || e === null) {
        document.getElementById('inputModal').classList.remove('open');
        document.getElementById('modalForm').reset();
    }
}

function setPriority(level) {
    document.getElementById('itemPriority').value = level;
    document.querySelectorAll('.radio-tile').forEach(tile => tile.classList.remove('selected'));
    if(level === 'High') document.getElementById('prio-high').classList.add('selected');
    else document.getElementById('prio-normal').classList.add('selected');
}

// معالجة النماذج
function handleFormSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('entryType').value;
    const name = document.getElementById('itemName').value;
    const priority = document.getElementById('itemPriority').value;
    
    if(type === 'task') {
        state.tasks.push({
            id: Date.now(),
            name: name,
            priority: priority,
            completed: false
        });
        showNotification('Task Assigned', 'Added to your daily protocol queue.');
    } else {
        // قراءة وتخصيص عدد خطوات الأهداف (Steps Target) المدخلة يدوياً
        const target = parseInt(document.getElementById('itemTarget').value) || 10;
        state.goals.push({
            id: Date.now(),
            name: name,
            target: target,
            current: 0,
            priority: priority
        });
        showNotification('Goal Formulated', `New goal with ${target} steps generated.`);
    }
    
    saveState();
    renderAll();
    closeModal(null);
}

// التفاعل مع المهام اليومية
function toggleTask(id) {
    state.tasks = state.tasks.map(task => {
        if(task.id === id) {
            const nextState = !task.completed;
            if(nextState) {
                confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
                state.gritScore += 5;
                if(state.streak === 0) state.streak = 1; // زيادة الستريك تلقائياً عند أول إنجاز
                checkAchievementsProgress();
            } else {
                state.gritScore = Math.max(0, state.gritScore - 5);
            }
            return { ...task, completed: nextState };
        }
        return task;
    });
    saveState();
    renderAll();
}

// زيادة ونقصان خطوات تحقيق الأهداف (Steps Control)
function incrementGoal(id) {
    state.goals = state.goals.map(goal => {
        if(goal.id === id && goal.current < goal.target) {
            const nextVal = goal.current + 1;
            state.gritScore += 5;
            if(nextVal === goal.target) {
                confetti({ particleCount: 100, spread: 100 });
                showNotification('Goal Completed! 🔥', `You reached milestone: ${goal.name}`);
                state.gritScore += 20;
                unlockAchievement('milestone_crushed');
            }
            return { ...goal, current: nextVal };
        }
        return goal;
    });
    saveState();
    renderAll();
}

function decrementGoal(id) {
    state.goals = state.goals.map(goal => {
        if(goal.id === id && goal.current > 0) {
            const nextVal = goal.current - 1;
            state.gritScore = Math.max(0, state.gritScore - 5);
            return { ...goal, current: nextVal };
        }
        return goal;
    });
    saveState();
    renderAll();
}

function deleteTask(id, type) {
    if(type === 'task') {
        state.tasks = state.tasks.filter(t => t.id !== id);
    } else {
        state.goals = state.goals.filter(g => g.id !== id);
    }
    saveState();
    renderAll();
}

function checkAchievementsProgress() {
    if(state.tasks.length > 0 && state.tasks.every(t => t.completed)) {
        unlockAchievement('clean_sheet');
        state.streak += 1; // زيادة الستريك عند إنهاء اليوم بالكامل بنجاح
    }
    if(state.tasks.filter(t => t.completed).length >= 1) {
        unlockAchievement('first_task');
    }
}

function unlockAchievement(id) {
    state.achievements = state.achievements.map(ach => {
        if(ach.id === id && !ach.unlocked) {
            showNotification('🏆 Achievement Earned', ach.title);
            return { ...ach, unlocked: true };
        }
        return ach;
    });
    saveState();
}

function showNotification(title, body) {
    const toast = document.getElementById('notificationToast');
    document.getElementById('notifTitle').innerText = title;
    document.getElementById('notifBody').innerText = body;
    
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

function triggerSimulatedRemind() {
    showNotification("⚡ Protocol Reminder", "Stay disciplined. Lock in your objectives.");
}

function renderAll() {
    document.getElementById('streakCount').innerText = state.streak;
    document.getElementById('gritScore').innerText = state.gritScore;
    
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.completed).length;
    document.getElementById('completionRatio').innerText = `${completedTasks}/${totalTasks}`;

    const taskList = document.getElementById('taskList');
    if(totalTasks === 0) {
        taskList.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:4px;">No operational objectives for today.</div>`;
    } else {
        taskList.innerHTML = state.tasks.map(task => `
            <div class="card-item ${task.completed ? 'completed' : ''}">
                <div class="card-left" onclick="toggleTask(${task.id})">
                    <div class="checkbox-trigger">
                        <i data-lucide="check" style="width:14px; height:14px;"></i>
                    </div>
                    <div class="item-details">
                        <h4>${task.name}</h4>
                        <span class="item-tag" style="${task.priority === 'High' ? 'color: var(--accent); background: var(--accent-glow);' : ''}">${task.priority} Priority</span>
                    </div>
                </div>
                <button class="btn-delete" onclick="deleteTask(${task.id}, 'task')">
                    <i data-lucide="trash-2" style="width:18px; height:18px;"></i>
                </button>
            </div>
        `).join('');
    }

    const goalList = document.getElementById('goalList');
    if(state.goals.length === 0) {
        goalList.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:4px;">No macro milestones logged.</div>`;
    } else {
        goalList.innerHTML = state.goals.map(goal => {
            const percentage = Math.min(100, Math.round((goal.current / goal.target) * 100));
            return `
                <div class="card-item" style="flex-direction: column; align-items: stretch; gap: 12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div class="item-details">
                            <h4 style="font-size:16px;">${goal.name}</h4>
                            <span class="item-tag">${goal.current} / ${goal.target} Steps</span>
                        </div>
                        <div style="display:flex; gap:12px; align-items:center;">
                            <div style="display:flex; gap:4px; background:var(--bg-tertiary); padding:4px; border-radius:8px; border:1px solid var(--border);">
                                <button class="btn-action-sm" onclick="decrementGoal(${goal.id})" ${goal.current <= 0 ? 'disabled style="opacity:0.3;"' : ''}>
                                        <i data-lucide="minus-circle" style="width:20px; height:20px;"></i>
                                </button>
                                <button class="btn-action-sm" onclick="incrementGoal(${goal.id})" ${goal.current >= goal.target ? 'disabled style="opacity:0.3;"' : ''}>
                                        <i data-lucide="plus-circle" style="width:20px; height:20px;"></i>
                                </button>
                            </div>
                            <button class="btn-delete" onclick="deleteTask(${goal.id}, 'goal')">
                                <i data-lucide="trash-2" style="width:16px;"></i>
                            </button>
                        </div>
                    </div>
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-bottom:4px;">
                            <span>Milestone Completion Progress</span>
                            <span>${percentage}%</span>
                        </div>
                        <div class="goal-progress-container">
                            <div class="goal-progress-bar" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    const achGrid = document.getElementById('achievementsGrid');
    achGrid.innerHTML = state.achievements.map(ach => `
        <div class="achievement-card ${ach.unlocked ? 'unlocked' : ''}">
            <div class="achievement-icon">
                <i data-lucide="${ach.unlocked ? 'award' : 'lock'}" style="width:20px; height:20px;"></i>
            </div>
            <h4>${ach.title}</h4>
            <p>${ach.desc}</p>
        </div>
    `).join('');

    lucide.createIcons();
}

function initChart() {
    const ctx = document.getElementById('analyticsChart');
    if(!ctx) return;
    if(chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Velocity Index',
                data: [0, 0, 0, 0, 0, 0, state.gritScore],
                borderColor: '#ff4757',
                borderWidth: 3,
                pointBackgroundColor: '#ff4757',
                tension: 0.3,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#a1a1aa' } },
                y: { grid: { color: '#27272a' }, ticks: { color: '#a1a1aa' } }
            }
        }
    });
}
