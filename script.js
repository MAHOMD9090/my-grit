// إدارة حالة التطبيق واسترجاع البيانات من ذاكرة الهاتف
let state = {
    tasks: JSON.parse(localStorage.getItem('grit_tasks')) || [
        { id: 1, name: "Cold plunge or shower 3 mins", priority: "High", completed: true },
        { id: 2, name: "Deep work block: Architecture design", priority: "High", completed: false },
        { id: 3, name: "Cardio conditioning session", priority: "Normal", completed: false }
    ],
    goals: JSON.parse(localStorage.getItem('grit_goals')) || [
        { id: 1, name: "Read 12 Technical Books", target: 12, current: 4, priority: "High" },
        { id: 2, name: "Run a sub 20-min 5K", target: 1, current: 0, priority: "Normal" }
    ],
    achievements: JSON.parse(localStorage.getItem('grit_achievements')) || [
        { id: 'first_task', title: 'First Blood', desc: 'Complete your initial daily objective.', unlocked: true },
        { id: 'clean_sheet', title: 'Flawless Execution', desc: 'Clear all tasks in a single day.', unlocked: false },
        { id: 'milestone_crushed', title: 'Apex Achiever', desc: 'Complete a long-term metric goal.', unlocked: false }
    ],
    streak: parseInt(localStorage.getItem('grit_streak')) || 5,
    gritScore: parseInt(localStorage.getItem('grit_gritScore')) || 82
};

let chartInstance = null;

// تشغيل التطبيق بمجرد تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    renderAll();
    initChart();
});

// حفظ البيانات في متصفح المستخدم
function saveState() {
    localStorage.setItem('grit_tasks', JSON.stringify(state.tasks));
    localStorage.setItem('grit_goals', JSON.stringify(state.goals));
    localStorage.setItem('grit_achievements', JSON.stringify(state.achievements));
    localStorage.setItem('grit_streak', state.streak);
    localStorage.setItem('grit_gritScore', state.gritScore);
}

// التنقل بين الصفحات السفلية
function switchView(viewId, element) {
    document.querySelectorAll('.view-panel').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.tab-bar .tab-item').forEach(tab => tab.classList.remove('active'));
    
    document.getElementById(`view-${viewId}`).classList.add('active');
    if(element) element.classList.add('active');

    if(viewId === 'analytics') {
        setTimeout(initChart, 50); // إعادة بناء الرسم البياني لضمان الأبعاد المناسبة لـ Canvas
    }
    
    if (navigator.vibrate) navigator.vibrate(10); // اهتزاز خفيف للهواتف المدعومة
}

// فتح النافذة المنبثقة للتحكم بالمدخلات
function openModal(type) {
    const overlay = document.getElementById('inputModal');
    document.getElementById('entryType').value = type;
    
    if(type === 'task') {
        document.getElementById('modalTitle').innerText = 'Add Protocol Task';
        document.getElementById('inputLabelName').innerText = 'Task Objective';
        document.getElementById('itemName').placeholder = 'e.g., Log 5 miles running';
        document.getElementById('targetValueGroup').style.display = 'none';
    } else {
        document.getElementById('modalTitle').innerText = 'Establish Milestone Goal';
        document.getElementById('inputLabelName').innerText = 'Goal Destination';
        document.getElementById('itemName').placeholder = 'e.g., Code masterclass applications';
        document.getElementById('targetValueGroup').style.display = 'block';
    }
    overlay.classList.add('open');
}

// إغلاق النافذة المنبثقة
function closeModal(e) {
    if(!e || e.target === document.getElementById('inputModal') || e === null) {
        document.getElementById('inputModal').classList.remove('open');
        document.getElementById('modalForm').reset();
    }
}

// اختيار الأولوية للمهام
function setPriority(level) {
    document.getElementById('itemPriority').value = level;
    document.querySelectorAll('.radio-tile').forEach(tile => tile.classList.remove('selected'));
    if(level === 'High') document.getElementById('prio-high').classList.add('selected');
    else document.getElementById('prio-normal').classList.add('selected');
}

// معالجة وحفظ البيانات بعد تعبئة النموذج
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
        const target = parseInt(document.getElementById('itemTarget').value) || 1;
        state.goals.push({
            id: Date.now(),
            name: name,
            target: target,
            current: 0,
            priority: priority
        });
        showNotification('Goal Formulated', 'New milestone baseline has been generated.');
    }
    
    saveState();
    renderAll();
    closeModal(null);
}

// إنهاء أو إلغاء إتمام المهام اليومية
function toggleTask(id) {
    state.tasks = state.tasks.map(task => {
        if(task.id === id) {
            const nextState = !task.completed;
            if(nextState) {
                confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 }, colors: ['#ff4757', '#10b981'] });
                state.gritScore += 5;
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

// زيادة العداد الخاص بالأهداف التراكمية
function incrementGoal(id) {
    state.goals = state.goals.map(goal => {
        if(goal.id === id && goal.current < goal.target) {
            const nextVal = goal.current + 1;
            if(nextVal === goal.target) {
                confetti({ particleCount: 100, spread: 100 });
                showNotification('Goal Completed! 🔥', `You reached milestone: ${goal.name}`);
                state.gritScore += 25;
                unlockAchievement('milestone_crushed');
            }
            return { ...goal, current: nextVal };
        }
        return goal;
    });
    saveState();
    renderAll();
}

// حذف مهمة أو هدف
function deleteTask(id, type) {
    if(type === 'task') {
        state.tasks = state.tasks.filter(t => t.id !== id);
    } else {
        state.goals = state.goals.filter(g => g.id !== id);
    }
    saveState();
    renderAll();
}

// التحقق من الإنجازات والأوسمة المستحقة
function checkAchievementsProgress() {
    if(state.tasks.length > 0 && state.tasks.every(t => t.completed)) {
        unlockAchievement('clean_sheet');
    }
    if(state.tasks.filter(t => t.completed).length >= 1) {
        unlockAchievement('first_task');
    }
}

// تفعيل فتح الأوسمة المغلقة
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

// محرك إشعارات التطبيق
function showNotification(title, body) {
    const toast = document.getElementById('notificationToast');
    document.getElementById('notifTitle').innerText = title;
    document.getElementById('notifBody').innerText = body;
    
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// محاكاة زر التذكير اليومي
function triggerSimulatedRemind() {
    showNotification("⚡ Protocol Reminder", "Stay disciplined. Log your remaining target points for the evening.");
}

// محرك رندرة وتحديث واجهات الـ DOM
function renderAll() {
    document.getElementById('streakCount').innerText = state.streak;
    document.getElementById('gritScore').innerText = state.gritScore;
    
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.completed).length;
    document.getElementById('completionRatio').innerText = `${completedTasks}/${totalTasks}`;

    // رندرة قائمة المهام اليومية
    const taskList = document.getElementById('taskList');
    if(totalTasks === 0) {
        taskList.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px;">No operational objectives for today.</div>`;
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

    // رندرة قائمة الأهداف طويلة المدى
    const goalList = document.getElementById('goalList');
    if(state.goals.length === 0) {
        goalList.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px;">No macro milestones logged.</div>`;
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
                        <div style="display:flex; gap:8px; align-items:center;">
                            <button class="btn-action-sm" onclick="incrementGoal(${goal.id})" ${goal.current >= goal.target ? 'disabled style="opacity:0.3"' : ''}>
                                <i data-lucide="plus-circle"></i> Log
                            </button>
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

    // رندرة شبكة الأوسمة والإنجازات
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

    lucide.createIcons(); // إعادة تفعيل الأيقونات للقطع التي تم توليدها حديثًا
}

// رسم المخطط البياني في صفحة التحليلات
function initChart() {
    const ctx = document.getElementById('analyticsChart');
    if(!ctx) return;
    
    if(chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Velocity Index',
                data: [65, 72, 68, 85, 80, 92, state.gritScore % 100 + 40],
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
                y: { grid: { color: '#27272a' }, ticks: { color: '#a1a1aa', stepSize: 20 } }
            }
        }
    });
}