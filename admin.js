import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, updatePassword } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  collection, addDoc, getDocs, query, where, orderBy, doc, getDoc, deleteDoc,
  updateDoc, setDoc, writeBatch, getCountFromServer
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ==================== THEME ====================
const savedTheme = localStorage.getItem('sass_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
const updateThemeIcon = () => {
  const icon = document.querySelector('#theme-toggle i');
  if (!icon) return;
  const current = document.documentElement.getAttribute('data-theme');
  icon.className = current === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
};
updateThemeIcon();

document.getElementById('theme-toggle').addEventListener('click', () => {
  const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('sass_theme', newTheme);
  updateThemeIcon();
});

// ==================== AUTH ====================
onAuthStateChanged(auth, async (user) => {
  setTimeout(() => {
    const loader = $('#loader');
    if (loader && !loader.classList.contains('hidden')) loader.classList.add('hidden');
  }, 3000);

  if (!user) { window.location.href = 'login.html'; return; }
  try {
    const q = query(collection(db, "admins"), where("uid", "==", user.uid), where("role", "==", "admin"));
    const snap = await getDocs(q);
    if (snap.empty) { await signOut(auth); window.location.href = 'login.html'; return; }
    $('#loader').classList.add('hidden');
    showSection('dashboard');
  } catch (e) {
    console.error(e);
    $('#loader').classList.add('hidden');
  }
});

$('#logout-btn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

// ==================== SIDEBAR NAVIGATION ====================
document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    showSection(link.dataset.section);
  });
});

function showSection(section) {
  const main = $('#admin-main');
  if (!main) return;
  main.innerHTML = `<div class="loading-state"><div class="spinner-ring"></div><p>Loading data...</p></div>`;
  switch(section) {
    case 'dashboard': loadDashboard(); break;
    case 'statistics': loadStatistics(); break;
    case 'teachers': loadTeachersSection(); break;
    case 'students': loadStudentsSection(); break;
    case 'registrations': loadRegistrationsSection(); break; // NEW TAB ROUTE
    case 'groups': loadGroupsSection(); break;
    case 'subjects': loadSubjectsSection(); break;
    case 'announcements': loadAnnouncementsSection(); break;
    case 'permissions': loadPermissionsSection(); break;
    case 'settings': loadSettingsSection(); break;
  }
}

// ==================== HELPER ====================
async function createAuthUser(email, password) {
  const API_KEY = "AIzaSyDDceDGKyu8tyZ_ZLPefkL3ElzVNHfQmN4";
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ email, password, returnSecureToken: false })
  });
  if (!res.ok) throw new Error((await res.json()).error.message);
  return (await res.json()).localId;
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
  try {
    const [tSnap, sSnap, aSnap, pSnap] = await Promise.all([
      getCountFromServer(collection(db, "teachers")),
      getCountFromServer(collection(db, "students")),
      getCountFromServer(collection(db, "announcements")),
      getCountFromServer(collection(db, "permissions"))
    ]);
    
    $('#admin-main').innerHTML = `
      <h2 class="section-title">Overview Dashboard</h2>
      <div class="stats-grid">
        <div class="stat-card"><i class="fa-solid fa-chalkboard-user"></i><div class="number">${tSnap.data().count}</div><div class="label">Teachers</div></div>
        <div class="stat-card"><i class="fa-solid fa-graduation-cap"></i><div class="number">${sSnap.data().count}</div><div class="label">Students</div></div>
        <div class="stat-card"><i class="fa-solid fa-bullhorn"></i><div class="number">${aSnap.data().count}</div><div class="label">Announcements</div></div>
        <div class="stat-card"><i class="fa-solid fa-user-shield"></i><div class="number">${pSnap.data().count}</div><div class="label">Permissions</div></div>
      </div>
    `;
  } catch (err) { 
    console.error(err); 
    $('#admin-main').innerHTML = `<div class="card"><p class="msg error">Failed to load dashboard: ${err.message}</p></div>`;
  }
}

// ==================== STATISTICS ====================
async function loadStatistics() {
  try {
    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue('--blue').trim() || '#38bdf8';
    const accent = styles.getPropertyValue('--purple').trim() || '#818cf8';
    const textColor = styles.getPropertyValue('--text2').trim() || '#94a3b8';

    const marksSnapAll = await getDocs(collection(db, "marks"));
    const studentTotalMarks = {};
    marksSnapAll.forEach(m => {
      const d = m.data();
      if (!studentTotalMarks[d.studentId]) studentTotalMarks[d.studentId] = 0;
      studentTotalMarks[d.studentId] += d.score;
    });

    const studentsSnapAll = await getDocs(collection(db, "students"));
    const studentNames = {};
    const gradeCounts = {};
    studentsSnapAll.forEach(doc => {
      const s = doc.data();
      studentNames[s.studentId || doc.id] = s.name || s.studentId;
      const g = s.grade || 'Unknown';
      gradeCounts[g] = (gradeCounts[g] || 0) + 1;
    });

    const topStudents = Object.entries(studentTotalMarks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([studentId, total]) => ({
        name: studentNames[studentId] || studentId,
        total
      }));

    let topStudentsHtml = '';
    if (topStudents.length === 0) {
      topStudentsHtml = '<p style="color:var(--text2); padding:10px 0;">No marks recorded yet.</p>';
    } else {
      topStudentsHtml = '<ol style="padding-left:20px; color:var(--text2);">';
      topStudents.forEach(s => {
        topStudentsHtml += `<li style="margin-bottom:8px;"><strong style="color:var(--text);">${s.name}</strong> – ${s.total.toFixed(1)} points</li>`;
      });
      topStudentsHtml += '</ol>';
    }

    $('#admin-main').innerHTML = `
      <h2 class="section-title">System Statistics</h2>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:24px;">
        <div class="card"><h3>Teachers per Subject</h3><div class="chart-container"><canvas id="teacherChart" height="200"></canvas></div></div>
        <div class="card"><h3>Students per Grade</h3><div class="chart-container"><canvas id="studentChart" height="200"></canvas></div></div>
        <div class="card"><h3>Top 5 Students (Total Marks)</h3>${topStudentsHtml}</div>
      </div>
    `;

    const tSnap = await getDocs(collection(db, "teachers"));
    const subjCounts = {};
    tSnap.forEach(doc => {
      const subj = doc.data().subject || 'Unknown';
      subjCounts[subj] = (subjCounts[subj] || 0) + 1;
    });
    
    new Chart($('#teacherChart'), {
      type: 'doughnut',
      data: { labels: Object.keys(subjCounts), datasets: [{ data: Object.values(subjCounts), backgroundColor: [primary, accent, '#facc15', '#10b981', '#ef4444', '#ec4899'] }] },
      options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { color: textColor } } } }
    });

    new Chart($('#studentChart'), {
      type: 'bar',
      data: { labels: Object.keys(gradeCounts), datasets: [{ label: 'Students', data: Object.values(gradeCounts), backgroundColor: accent }] },
      options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor }, beginAtZero: true } } }
    });
  } catch (err) { console.error(err); }
}

// ==================== TEACHERS ====================
async function loadTeachersSection() {
  try {
    const tSnap = await getDocs(collection(db, "teachers"));
    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
        <h2 class="section-title" style="margin:0;">Teachers</h2>
        <button class="btn-primary" id="add-teacher-btn"><i class="fa-solid fa-plus"></i> Add Teacher</button>
      </div>
      <div class="card table-container" style="padding:0;">
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Subject</th><th>Email</th><th>Actions</th></tr></thead>
          <tbody id="teacher-tbody">
    `;
    
    let rows = '';
    tSnap.forEach(doc => {
      const td = doc.data();
      rows += `<tr>
        <td style="font-family:monospace;">${td.teacherCode}</td>
        <td style="font-weight:500;">${td.name}</td>
        <td>${td.subject}</td>
        <td style="color:var(--text2);">${td.email || '-'}</td>
        <td><button class="action-btn btn-view" data-teacher-id="${doc.id}">View Details</button></td>
      </tr>`;
    });
    html += rows + `</tbody></table></div>`;
    
    $('#admin-main').innerHTML = html;

    $('#teacher-tbody').addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-view');
      if (!btn) return;
      showTeacherDashboard(btn.dataset.teacherId);
    });

    $('#add-teacher-btn').addEventListener('click', () => showAddTeacherForm());
  } catch (err) { console.error(err); }
}

async function showTeacherDashboard(teacherId) {
  try {
    $('#admin-main').innerHTML = `
      <div class="section-title">
        <button id="back-to-teachers" style="background:var(--input-bg); border:1px solid var(--border); color:var(--text); padding:8px 12px; border-radius:8px; cursor:pointer; margin-right:16px;"><i class="fa-solid fa-arrow-left"></i></button>
        Teacher Profile
      </div>
      <div class="card" id="teacher-info-card"><div class="spinner-ring" style="margin:20px auto;"></div></div>
      <div class="card" id="teacher-marks-card"><div class="spinner-ring" style="margin:20px auto;"></div></div>
    `;

    $('#back-to-teachers').addEventListener('click', () => loadTeachersSection());

    const tdoc = await getDoc(doc(db, "teachers", teacherId));
    if (!tdoc.exists()) { $('#teacher-info-card').innerHTML = '<p>Teacher not found.</p>'; return; }
    const td = tdoc.data();
    td.id = tdoc.id;

    const mSnap = await getDocs(query(collection(db, "marks"), where("subject", "==", td.subject), orderBy("score", "desc")));

    $('#teacher-info-card').innerHTML = `
      <h3>${td.name}</h3>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:12px;">
        <p><strong>Code:</strong> <span style="font-family:monospace;">${td.teacherCode}</span></p>
        <p><strong>Email:</strong> <span style="color:var(--text2);">${td.email || 'N/A'}</span></p>
        <p><strong>Subject:</strong> <span style="color:var(--blue); font-weight:600;">${td.subject}</span></p>
      </div>
      <button id="edit-teacher-btn" class="btn-primary" style="margin-top:16px; width:auto;"><i class="fa-solid fa-pen-to-square"></i> Edit Details</button>
    `;
    $('#edit-teacher-btn').addEventListener('click', () => showEditTeacherForm(td));

    let mhtml = `<h3>Recent Marks Recorded (${td.subject})</h3>`;
    if (mSnap.empty) {
      mhtml += '<p style="color:var(--text2); margin-top:12px;">No marks recorded by this teacher yet.</p>';
    } else {
      mhtml += '<div class="table-container"><table><thead><tr><th>Student ID</th><th>Score</th></tr></thead><tbody>';
      let rows = '';
      mSnap.forEach(m => { rows += `<tr><td style="font-family:monospace;">${m.data().studentId}</td><td><strong>${m.data().score}</strong></td></tr>`; });
      mhtml += rows + '</tbody></table></div>';
    }
    $('#teacher-marks-card').innerHTML = mhtml;
  } catch (err) { console.error(err); }
}

function showEditTeacherForm(teacher) {
  $('#teacher-info-card').innerHTML = `
    <h3>Edit Teacher Profile</h3>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-top:12px;">
      <div class="form-group"><label>Full Name</label><input type="text" id="edit-name" value="${teacher.name}"></div>
      <div class="form-group"><label>Email Address</label><input type="email" id="edit-email" value="${teacher.email || ''}"></div>
      <div class="form-group"><label>Subject</label><input type="text" id="edit-subject" value="${teacher.subject}"></div>
      <div class="form-group"><label>Teacher Code</label><input type="text" id="edit-code" value="${teacher.teacherCode}"></div>
    </div>
    <div style="display:flex; gap:12px; margin-top:8px;">
      <button id="save-edit-btn" class="btn-primary"><i class="fa-solid fa-save"></i> Save Changes</button>
      <button id="cancel-edit-btn" style="background:var(--input-bg); border:1px solid var(--border); color:var(--text); padding:10px 20px; border-radius:8px; cursor:pointer;">Cancel</button>
    </div>
  `;
  $('#cancel-edit-btn').addEventListener('click', () => showTeacherDashboard(teacher.id));
  $('#save-edit-btn').addEventListener('click', () => saveTeacherEdit(teacher.id));
}

async function saveTeacherEdit(teacherId) {
  const name = $('#edit-name').value.trim();
  const email = $('#edit-email').value.trim();
  const subject = $('#edit-subject').value.trim();
  const code = $('#edit-code').value.trim();
  if (!name || !subject || !code) return alert('Name, Subject, and Code are required.');
  
  const btn = $('#save-edit-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  
  try {
    await updateDoc(doc(db, "teachers", teacherId), { name, email, subject, teacherCode: code });
    showTeacherDashboard(teacherId);
  } catch (err) { 
    alert('Update failed: ' + err.message); 
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-save"></i> Save Changes';
  }
}

async function showAddTeacherForm() {
  const subjectsSnap = await getDocs(collection(db, "subjects"));
  let subjectOptions = '';
  subjectsSnap.forEach(doc => {
    subjectOptions += `<option value="${doc.data().name}">${doc.data().name}</option>`;
  });

  $('#admin-main').innerHTML = `
    <div class="section-title">
      <button onclick="document.querySelector('.sidebar-link[data-section=\\'teachers\\']').click()" style="background:var(--input-bg); border:1px solid var(--border); color:var(--text); padding:8px 12px; border-radius:8px; cursor:pointer; margin-right:16px;"><i class="fa-solid fa-arrow-left"></i></button>
      Add New Teacher
    </div>
    <div class="card" style="max-width:600px;">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
        <div class="form-group"><label>Email Address</label><input type="email" id="new-teacher-email" placeholder="teacher@sedenadea.edu.et"></div>
        <div class="form-group"><label>Temporary Password</label><input type="password" id="new-teacher-pass" placeholder="Min 6 characters"></div>
        <div class="form-group"><label>Full Name</label><input type="text" id="new-teacher-name" placeholder="E.g. Mr. Abebe"></div>
        <div class="form-group"><label>Teacher Code</label><input type="text" id="new-teacher-code" placeholder="E.g. MATH001"></div>
        <div class="form-group" style="grid-column: span 2;">
          <label>Assigned Subject</label>
          <select id="new-teacher-subject">${subjectOptions}</select>
        </div>
      </div>
      <button class="btn-primary" id="save-teacher-btn" style="margin-top:16px;"><i class="fa-solid fa-user-plus"></i> Create Account</button>
      <p class="msg" id="add-teacher-msg"></p>
    </div>
  `;

  $('#save-teacher-btn').addEventListener('click', async (e) => {
    const email = $('#new-teacher-email').value.trim();
    const pass = $('#new-teacher-pass').value.trim();
    const code = $('#new-teacher-code').value.trim();
    const name = $('#new-teacher-name').value.trim();
    const subject = $('#new-teacher-subject').value;
    const msg = $('#add-teacher-msg');
    
    if (!email || pass.length < 6 || !code || !name || !subject) {
      msg.textContent = 'Please fill all fields correctly.'; msg.className = 'msg error';
      return;
    }
    
    const btn = e.target;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';
    
    try {
      const uid = await createAuthUser(email, pass);
      await setDoc(doc(db, "teachers", uid), { teacherCode: code, name, subject, uid, email });
      msg.textContent = 'Teacher account created successfully!'; msg.className = 'msg success';
      setTimeout(() => document.querySelector('.sidebar-link[data-section="teachers"]').click(), 1500);
    } catch(err) {
      msg.textContent = err.message; msg.className = 'msg error';
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
    }
  });
}

// ==================== STUDENTS ====================
async function loadStudentsSection() {
  try {
    const sSnap = await getDocs(collection(db, "students"));
    const combos = new Set();
    sSnap.forEach(doc => {
      const g = doc.data().grade || '';
      const s = doc.data().section || '';
      if (g) combos.add(`${g}${s}`);
    });
    let options = '<option value="">All Grades & Sections</option>';
    Array.from(combos).sort().forEach(c => { options += `<option value="${c}">Grade ${c}</option>`; });

    $('#admin-main').innerHTML = `
      <h2 class="section-title">Student Directory</h2>
      <div class="card" style="margin-bottom:16px;">
        <div class="form-group" style="margin:0; max-width:300px;">
          <label>Filter Directory</label>
          <select id="filter-grade-select">${options}</select>
        </div>
      </div>
      <div class="card table-container" style="padding:0;">
        <table>
          <thead><tr><th>Student ID</th><th>Full Name</th><th>Email</th><th>Grade</th><th>Section</th></tr></thead>
          <tbody id="student-tbody"><tr><td colspan="5" style="text-align:center;"><div class="spinner-ring" style="margin:10px auto;"></div></td></tr></tbody>
        </table>
      </div>
    `;

    async function refresh() {
      const filter = $('#filter-grade-select').value;
      let q = query(collection(db, "students"), where("uid", "!=", ""));
      if (filter) {
        const grade = filter.slice(0, -1);
        const section = filter.slice(-1);
        q = query(q, where("grade", "==", grade), where("section", "==", section));
      }
      const snap = await getDocs(q);
      
      let rows = '';
      if(snap.empty) {
        rows = '<tr><td colspan="5" style="text-align:center; color:var(--text2);">No students found.</td></tr>';
      } else {
        snap.forEach(doc => {
          const st = doc.data();
          rows += `<tr>
            <td style="font-family:monospace;">${st.studentId || '-'}</td>
            <td style="font-weight:500;">${st.name}</td>
            <td style="color:var(--text2);">${st.email || '-'}</td>
            <td>${st.grade || '-'}</td>
            <td>${st.section || '-'}</td>
          </tr>`;
        });
      }
      $('#student-tbody').innerHTML = rows;
    }

    $('#filter-grade-select').addEventListener('change', () => {
      $('#student-tbody').innerHTML = '<tr><td colspan="5" style="text-align:center;"><div class="spinner-ring" style="margin:10px auto;"></div></td></tr>';
      refresh();
    });
    
    await refresh();
  } catch (err) { console.error(err); }
}

// ==================== NEW: REGISTRATIONS ====================
async function loadRegistrationsSection() {
  $('#admin-main').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
      <h2 class="section-title" style="margin:0;"><i class="fa-solid fa-id-card"></i> Registrations & Card Orders</h2>
      <button class="btn-primary" id="btn-refresh-regs"><i class="fa-solid fa-rotate-right"></i> Refresh</button>
    </div>
    <div class="card table-container" style="padding:0;">
      <table>
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Name</th>
            <th>New Grade</th>
            <th>Payment</th>
            <th>Card Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="registrations-tbody">
          <tr><td colspan="6" style="text-align:center;"><div class="spinner-ring" style="margin:20px auto;"></div></td></tr>
        </tbody>
      </table>
    </div>
  `;

  const refreshRegs = async () => {
    const tbody = $('#registrations-tbody');
    try {
      const q = query(collection(db, "registrations"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text2);">No registrations found for this year.</td></tr>';
        return;
      }

      let rows = '';
      snap.forEach(documentSnapshot => {
        const data = documentSnapshot.data();
        
        const payBadge = `<span style="background: rgba(16,185,129,0.1); color: var(--green); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold;"><i class="fa-solid fa-check"></i> ${data.paymentStatus}</span>`;
        let cardBadge, actionBtn;

        if (data.cardStatus === 'PENDING') {
          cardBadge = `<span style="background: rgba(245,158,11,0.1); color: #f59e0b; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold;"><i class="fa-solid fa-clock"></i> PENDING</span>`;
          actionBtn = `<button class="action-btn btn-view btn-approve-card" data-id="${documentSnapshot.id}"><i class="fa-solid fa-print"></i> Mark Printed</button>`;
        } else {
          cardBadge = `<span style="background: rgba(16,185,129,0.1); color: var(--green); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold;"><i class="fa-solid fa-check-double"></i> ISSUED</span>`;
          actionBtn = `<span style="color: var(--text2); font-size: 0.8rem; font-weight:600;"><i class="fa-solid fa-check"></i> Completed</span>`;
        }

        rows += `<tr>
          <td style="font-family: monospace; font-weight:600;">${data.studentId}</td>
          <td style="font-weight: 600;">${data.name}</td>
          <td>Grade ${data.nextGrade} ${data.previousSection}</td>
          <td>${payBadge}</td>
          <td>${cardBadge}</td>
          <td>${actionBtn}</td>
        </tr>`;
      });
      tbody.innerHTML = rows;

      document.querySelectorAll('.btn-approve-card').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.closest('.btn-approve-card').dataset.id;
          if(confirm("Mark this student's ID card as Printed/Issued?")) {
            await updateDoc(doc(db, "registrations", id), { cardStatus: "ISSUED" });
            refreshRegs();
          }
        });
      });

    } catch (error) {
      console.error(error);
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--red);">Error loading data.</td></tr>';
    }
  };

  await refreshRegs();

  $('#btn-refresh-regs').addEventListener('click', () => {
    $('#registrations-tbody').innerHTML = '<tr><td colspan="6" style="text-align:center;"><div class="spinner-ring" style="margin:20px auto;"></div></td></tr>';
    refreshRegs();
  });
}

// ==================== SUBJECTS ====================
async function loadSubjectsSection() {
  try {
    $('#admin-main').innerHTML = `
      <h2 class="section-title">Manage Subjects</h2>
      <div class="card" style="max-width:500px;">
        <h3>Add New Subject</h3>
        <div class="form-group" style="display:flex; gap:12px; align-items:flex-end;">
          <div style="flex:1;"><label>Subject Name</label><input type="text" id="new-subject-name" placeholder="e.g. Physics"></div>
          <button class="btn-primary" id="add-subject-btn" style="margin:0;"><i class="fa-solid fa-plus"></i> Add</button>
        </div>
        <p class="msg" id="subject-msg"></p>
      </div>
      <div class="card table-container" style="max-width:500px; padding:0;">
        <table>
          <thead><tr><th>Subject Name</th><th style="text-align:right;">Actions</th></tr></thead>
          <tbody id="subject-tbody"><tr><td colspan="2" style="text-align:center;"><div class="spinner-ring" style="margin:10px auto;"></div></td></tr></tbody>
        </table>
      </div>
    `;

    const refresh = async () => {
      const snap = await getDocs(collection(db, "subjects"));
      let rows = '';
      if(snap.empty) {
        rows = '<tr><td colspan="2" style="text-align:center; color:var(--text2);">No subjects defined.</td></tr>';
      } else {
        snap.forEach(doc => {
          rows += `<tr>
            <td style="font-weight:500;">${doc.data().name}</td>
            <td style="text-align:right;"><button class="action-btn btn-del btn-delete-subject" data-id="${doc.id}">Delete</button></td>
          </tr>`;
        });
      }
      $('#subject-tbody').innerHTML = rows;
      
      document.querySelectorAll('.btn-delete-subject').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          if (confirm(`Are you sure you want to delete this subject?`)) {
            await deleteDoc(doc(db, "subjects", e.target.dataset.id));
            refresh();
          }
        });
      });
    };
    await refresh();

    $('#add-subject-btn').addEventListener('click', async () => {
      const name = $('#new-subject-name').value.trim();
      const msg = $('#subject-msg');
      if (!name) { msg.textContent = 'Subject name is required.'; msg.className = 'msg error'; return; }
      const existing = await getDocs(query(collection(db, "subjects"), where("name", "==", name)));
      if (!existing.empty) { msg.textContent = 'Subject already exists.'; msg.className = 'msg error'; return; }
      
      $('#add-subject-btn').disabled = true;
      await addDoc(collection(db, "subjects"), { name });
      msg.textContent = 'Subject added successfully!'; msg.className = 'msg success';
      $('#new-subject-name').value = '';
      $('#add-subject-btn').disabled = false;
      refresh();
      setTimeout(() => { msg.className = 'msg'; }, 3000);
    });
  } catch (err) { console.error(err); }
}

// ==================== GROUPS (CLASSES) ====================
async function loadGroupsSection() {
  try {
    let sectionOptions = '';
    for (let i = 65; i <= 90; i++) sectionOptions += `<option value="${String.fromCharCode(i)}">${String.fromCharCode(i)}</option>`;

    $('#admin-main').innerHTML = `
      <h2 class="section-title">Class Management</h2>
      <div class="card" style="max-width:600px;">
        <h3>Create New Class</h3>
        <div style="display:flex; gap:16px; align-items:flex-end;">
          <div class="form-group" style="margin:0; flex:1;"><label>Grade Level</label><select id="new-grade"><option value="9">9</option><option value="10">10</option><option value="11">11</option><option value="12">12</option></select></div>
          <div class="form-group" style="margin:0; flex:1;"><label>Section</label><select id="new-section">${sectionOptions}</select></div>
          <button class="btn-primary" id="add-group-btn" style="margin:0;"><i class="fa-solid fa-plus"></i> Create</button>
        </div>
        <p class="msg" id="group-msg"></p>
      </div>
      <div class="card table-container" style="padding:0;">
        <table>
          <thead><tr><th>Grade</th><th>Section</th><th>Total Students</th><th>Actions</th></tr></thead>
          <tbody id="group-tbody"><tr><td colspan="4" style="text-align:center;"><div class="spinner-ring" style="margin:10px auto;"></div></td></tr></tbody>
        </table>
      </div>
    `;

    async function refresh() {
      const groupSnap = await getDocs(collection(db, "groups"));
      const sSnap = await getDocs(collection(db, "students"));
      const studentCounts = {};
      sSnap.forEach(doc => {
        const g = doc.data().grade || '', s = doc.data().section || '';
        if (g && s) studentCounts[`${g}${s}`] = (studentCounts[`${g}${s}`] || 0) + 1;
      });

      let rows = '';
      if(groupSnap.empty) {
         rows = '<tr><td colspan="4" style="text-align:center; color:var(--text2);">No classes created yet.</td></tr>';
      } else {
        groupSnap.forEach(doc => {
          const grp = doc.data();
          const key = `${grp.grade}${grp.section}`;
          const count = studentCounts[key] || 0;
          rows += `<tr>
            <td><strong>${grp.grade}</strong></td>
            <td><strong>${grp.section}</strong></td>
            <td><span style="background:var(--input-bg); padding:4px 10px; border-radius:20px; font-size:0.8rem;">${count} Students</span></td>
            <td style="display:flex; gap:8px;">
              <button class="action-btn btn-view btn-view-group" data-grade="${grp.grade}" data-section="${grp.section}">Manage</button>
              <button class="action-btn btn-save btn-pdf-group" data-grade="${grp.grade}" data-section="${grp.section}">Export PDF</button>
              <button class="action-btn btn-del btn-delete-group" data-id="${doc.id}">Delete</button>
            </td>
          </tr>`;
        });
      }
      $('#group-tbody').innerHTML = rows;

      document.querySelectorAll('.btn-view-group').forEach(btn => btn.addEventListener('click', (e) => showGroupDetail(e.target.dataset.grade, e.target.dataset.section)));
      document.querySelectorAll('.btn-pdf-group').forEach(btn => btn.addEventListener('click', (e) => generateClassPDF(e.target.dataset.grade, e.target.dataset.section, e.target)));
      document.querySelectorAll('.btn-delete-group').forEach(btn => btn.addEventListener('click', async (e) => {
        if (confirm('Delete this class definition? (Students will remain in database but lose their class grouping)')) {
          await deleteDoc(doc(db, "groups", e.target.dataset.id));
          refresh();
        }
      }));
    }
    await refresh();

    $('#add-group-btn').addEventListener('click', async (e) => {
      const grade = $('#new-grade').value, section = $('#new-section').value;
      const msg = $('#group-msg');
      const existing = await getDocs(query(collection(db, "groups"), where("grade", "==", grade), where("section", "==", section)));
      if (!existing.empty) { msg.textContent = 'Class already exists.'; msg.className = 'msg error'; return; }
      
      e.target.disabled = true;
      await addDoc(collection(db, "groups"), { grade, section });
      msg.textContent = `Class ${grade}${section} created!`; msg.className = 'msg success';
      e.target.disabled = false;
      refresh();
      setTimeout(() => { msg.className = 'msg'; }, 3000);
    });
  } catch (err) { console.error(err); }
}

async function generateClassPDF(grade, section, btnElement) {
  const originalText = btnElement.textContent;
  btnElement.textContent = 'Generating...';
  btnElement.disabled = true;

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const studentsSnap = await getDocs(query(collection(db, "students"), where("grade", "==", grade), where("section", "==", section)));
    
    const studentIds = studentsSnap.docs.map(d => d.data().studentId || d.id);
    const marksMap = {};
    if(studentIds.length > 0) {
      for (let i = 0; i < studentIds.length; i += 10) {
        const chunk = studentIds.slice(i, i + 10);
        const marksSnap = await getDocs(query(collection(db, "marks"), where("studentId", "in", chunk)));
        marksSnap.forEach(m => {
          const d = m.data();
          if (!marksMap[d.studentId]) marksMap[d.studentId] = {};
          marksMap[d.studentId][d.subject] = d.score;
        });
      }
    }

    let firstPage = true;
    for (const studentDoc of studentsSnap.docs) {
      const st = studentDoc.data();
      if (!firstPage) doc.addPage();
      firstPage = false;
      doc.setFontSize(16);
      doc.text(`Student Academic Record – ${st.name}`, 10, 20);
      doc.setFontSize(12);
      doc.text(`ID: ${st.studentId || '-'}   |   Class: Grade ${grade}${section}`, 10, 30);
      
      const subjectsSnap = await getDocs(collection(db, "subjects"));
      const tableRows = [];
      subjectsSnap.forEach(subDoc => {
        const sub = subDoc.data().name;
        const score = marksMap[st.studentId]?.[sub] ?? '-';
        tableRows.push([sub, score.toString()]);
      });
      if (tableRows.length > 0) {
        doc.autoTable({ startY: 40, head: [['Subject', 'Score']], body: tableRows, theme: 'grid' });
      }
    }
    doc.save(`SedenAdea_Class_${grade}${section}_Records.pdf`);
  } catch(e) {
    console.error(e);
    alert('Error generating PDF.');
  } finally {
    btnElement.textContent = originalText;
    btnElement.disabled = false;
  }
}

async function generateStudentPDF(docId) {
  try {
    const studentDoc = await getDoc(doc(db, "students", docId));
    if (!studentDoc.exists()) return;
    const st = studentDoc.data();
    const marksSnap = await getDocs(query(collection(db, "marks"), where("studentId", "==", st.studentId)));
    const marksMap = {};
    marksSnap.forEach(m => marksMap[m.data().subject] = m.data().score);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Student Academic Record – ${st.name}`, 10, 20);
    doc.setFontSize(12);
    doc.text(`ID: ${st.studentId || '-'}   |   Class: Grade ${st.grade || ''}${st.section || ''}`, 10, 30);
    
    const subjectsSnap = await getDocs(collection(db, "subjects"));
    const tableRows = [];
    subjectsSnap.forEach(subDoc => {
      const sub = subDoc.data().name;
      const score = marksMap[sub] ?? '-';
      tableRows.push([sub, score.toString()]);
    });
    if (tableRows.length > 0) {
      doc.autoTable({ startY: 40, head: [['Subject', 'Score']], body: tableRows, theme: 'grid' });
    }
    doc.save(`Student_${st.studentId}_Record.pdf`);
  } catch(e) {
    console.error(e);
    alert("Error generating PDF.");
  }
}

async function showGroupDetail(grade, section) {
  $('#admin-main').innerHTML = `<div class="loading-state"><div class="spinner-ring"></div><p>Calculating class rankings and data...</p></div>`;
  
  try {
    const classStudentsSnap = await getDocs(query(collection(db, "students"), where("grade", "==", grade), where("section", "==", section)));
    const studentClsMap = {};
    const studentIds = [];
    classStudentsSnap.forEach(doc => {
      const s = doc.data();
      const id = s.studentId || doc.id;
      studentClsMap[id] = { grade: s.grade, section: s.section };
      studentIds.push(id);
    });

    const studentMarksMap = {};
    if(studentIds.length > 0) {
      for (let i = 0; i < studentIds.length; i += 10) {
        const chunk = studentIds.slice(i, i + 10);
        const marksSnap = await getDocs(query(collection(db, "marks"), where("studentId", "in", chunk)));
        marksSnap.forEach(m => {
          const d = m.data();
          if (!studentMarksMap[d.studentId]) studentMarksMap[d.studentId] = { total:0, count:0, scores:{} };
          studentMarksMap[d.studentId].total += d.score;
          studentMarksMap[d.studentId].count++;
          studentMarksMap[d.studentId].scores[d.subject] = d.score;
        });
      }
    }

    const classAverages = [];
    for (const [studentId, data] of Object.entries(studentMarksMap)) {
      classAverages.push({ studentId, avg: data.total / data.count });
    }
    classAverages.sort((a,b) => b.avg - a.avg);

    const subjectsSnap = await getDocs(collection(db, "subjects"));
    const allSubjects = [];
    subjectsSnap.forEach(doc => allSubjects.push(doc.data().name));

    let html = `
      <div class="section-title">
        <button id="back-to-groups" style="background:var(--input-bg); border:1px solid var(--border); color:var(--text); padding:8px 12px; border-radius:8px; cursor:pointer; margin-right:16px;"><i class="fa-solid fa-arrow-left"></i></button>
        Manage Class: Grade ${grade}${section}
      </div>
      
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap:24px; margin-bottom:24px;">
        <div class="card" style="margin:0;">
          <h3><i class="fa-solid fa-user-plus" style="color:var(--blue); margin-right:8px;"></i> Add Student Manually</h3>
          <div class="form-group"><input type="text" id="student-name" placeholder="Full Student Name"></div>
          <div class="form-group"><input type="email" id="student-email" placeholder="Email Address (Optional)"></div>
          <button class="btn-primary" id="add-student-btn"><i class="fa-solid fa-plus"></i> Enroll Student</button>
          <p class="msg" id="student-msg"></p>
        </div>
        
        <div class="card" style="margin:0;">
          <h3><i class="fa-solid fa-file-excel" style="color:var(--green); margin-right:8px;"></i> Bulk Import via Excel</h3>
          <p style="color:var(--text2); font-size:0.85rem; margin-bottom:12px;">Upload a .xlsx file containing columns for <strong>Name</strong> and <strong>Email</strong>.</p>
          <input type="file" id="excel-file" accept=".xlsx" style="margin-bottom:12px;">
          <div style="display:flex; gap:12px;">
            <button class="btn-primary" id="import-excel-btn"><i class="fa-solid fa-upload"></i> Import</button>
            <button class="btn-primary" id="download-example-excel" style="background:var(--surface); border:1px solid var(--border); color:var(--text);"><i class="fa-solid fa-download"></i> Template</button>
          </div>
          <p class="msg" id="excel-msg"></p>
        </div>
      </div>

      <div class="card table-container" style="padding:0;">
        <table id="cls-students-table">
          <thead><tr><th>Student ID</th><th>Full Name</th><th>Email</th><th>Actions</th></tr></thead>
          <tbody id="cls-students-tbody"></tbody>
        </table>
      </div>
    `;

    $('#admin-main').innerHTML = html;
    $('#back-to-groups').addEventListener('click', () => loadGroupsSection());

    $('#download-example-excel').addEventListener('click', () => {
      const ws_data = [['Name', 'Email'], ['John Doe', 'john@sedenadea.edu.et']];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      XLSX.writeFile(wb, "SedenAdea_Import_Template.xlsx");
    });

    async function refreshClassStudents() {
      const snap = await getDocs(query(collection(db, "students"), where("grade", "==", grade), where("section", "==", section)));
      let rows = '';
      if(snap.empty) {
        rows = '<tr><td colspan="4" style="text-align:center; color:var(--text2);">No students enrolled in this class yet.</td></tr>';
      } else {
        snap.forEach(doc => {
          const s = doc.data();
          const studentId = s.studentId || doc.id;
          const rowId = `student-row-${doc.id}`;
          const detailsId = `student-details-${doc.id}`;
          rows += `
            <tr id="${rowId}">
              <td style="font-family:monospace;">${studentId}</td>
              <td style="font-weight:500;">${s.name}</td>
              <td style="color:var(--text2);">${s.email || '-'}</td>
              <td style="display:flex; gap:6px;">
                <button class="action-btn btn-view btn-toggle-details" data-student-id="${studentId}" data-details-id="${detailsId}">Marks</button>
                <button class="action-btn btn-edit btn-edit-student" data-student-doc-id="${doc.id}">Edit</button>
                <button class="action-btn btn-save btn-save-single" data-student-doc-id="${doc.id}">PDF</button>
                <button class="action-btn btn-del btn-delete-student" data-student-doc-id="${doc.id}" data-student-name="${s.name}">Drop</button>
              </td>
            </tr>
            <tr id="${detailsId}" style="display:none; background:var(--input-bg);">
              <td colspan="4" style="padding:20px;">
                <div class="spinner-ring" style="margin:0 auto;"></div>
              </td>
            </tr>
          `;
        });
      }
      $('#cls-students-tbody').innerHTML = rows;

      document.querySelectorAll('.btn-toggle-details').forEach(btn => {
        btn.addEventListener('click', async () => {
          const studentId = btn.dataset.studentId;
          const detailsId = btn.dataset.detailsId;
          const row = document.getElementById(detailsId);
          const isHidden = row.style.display === 'none';
          row.style.display = isHidden ? 'table-row' : 'none';
          if (!isHidden) return;
          
          const cell = row.querySelector('td');
          const existingScores = studentMarksMap[studentId]?.scores || {};
          let total = 0, count = 0;
          let mHtml = '<div class="table-container" style="margin-top:0;"><table><thead><tr>';
          allSubjects.forEach(sub => { mHtml += `<th>${sub}</th>`; });
          mHtml += '<th>Total</th><th>Avg</th><th>Class Rank</th></tr></thead><tbody><tr>';
          
          allSubjects.forEach(sub => {
            const val = existingScores[sub] !== undefined ? existingScores[sub] : '';
            mHtml += `<td><input type="number" class="mark-input" data-subject="${sub}" value="${val}" min="0" max="100" step="0.1" placeholder="-"></td>`;
            if (val !== '') { total += parseFloat(val); count++; }
          });
          
          const avg = count > 0 ? (total / count).toFixed(1) : '-';
          const rankIdx = classAverages.findIndex(item => item.studentId === studentId);
          const rank = rankIdx !== -1 ? rankIdx + 1 : '-';
          
          mHtml += `<td><strong>${count > 0 ? total : '-'}</strong></td>`;
          mHtml += `<td><strong>${avg}</strong></td>`;
          mHtml += `<td><span style="background:var(--blue); color:#fff; padding:4px 10px; border-radius:12px;">#${rank}</span></td>`;
          mHtml += '</tr></tbody></table></div>';
          mHtml += `<button class="btn-primary btn-save-marks" data-student-id="${studentId}" style="margin-top:16px;"><i class="fa-solid fa-save"></i> Override Marks</button>`;
          
          cell.innerHTML = mHtml;

          cell.querySelector('.btn-save-marks').addEventListener('click', async (e) => {
            e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            e.target.disabled = true;
            const inputs = cell.querySelectorAll('.mark-input');
            const batch = writeBatch(db);
            const existingDocs = await getDocs(query(collection(db, "marks"), where("studentId", "==", studentId)));
            existingDocs.forEach(doc => batch.delete(doc.ref));
            
            inputs.forEach(inp => {
              const val = parseFloat(inp.value);
              if (!isNaN(val)) {
                batch.set(doc(collection(db, "marks")), { studentId, subject: inp.dataset.subject, score: val, grade, section });
              }
            });
            await batch.commit();
            showGroupDetail(grade, section); 
          });
        });
      });

      document.querySelectorAll('.btn-edit-student').forEach(btn => btn.addEventListener('click', (e) => openStudentEditModal(e.target.dataset.studentDocId, grade, section)));
      document.querySelectorAll('.btn-delete-student').forEach(btn => btn.addEventListener('click', async (e) => {
        if (confirm(`Remove student ${e.target.dataset.studentName}? This cannot be undone.`)) {
          await deleteDoc(doc(db, "students", e.target.dataset.studentDocId));
          refreshClassStudents();
        }
      }));
      document.querySelectorAll('.btn-save-single').forEach(btn => btn.addEventListener('click', (e) => generateStudentPDF(e.target.dataset.studentDocId)));
    }

    await refreshClassStudents();

    $('#import-excel-btn').addEventListener('click', async (e) => {
      const file = document.getElementById('excel-file').files[0];
      const msg = $('#excel-msg');
      if (!file) { msg.textContent = 'Please select an Excel file.'; msg.className = 'msg error'; return; }
      
      const btn = e.target;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importing...';
      
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = new Uint8Array(ev.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          if (rows.length < 2) throw new Error('File must have a header row and at least one student.');
          
          let count = 0;
          const existingSnap = await getCountFromServer(collection(db, "students"));
          let total = existingSnap.data().count;
          
          const batch = writeBatch(db);
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const name = (row[0] || '').trim();
            if (name) {
              const email = (row[1] || '').trim();
              total++;
              const studentId = `SASS-${new Date().getFullYear()}-${String(total).padStart(4,'0')}`;
              batch.set(doc(collection(db, "students")), { name, email, studentId, grade, section });
              count++;
            }
          }
          await batch.commit();
          msg.textContent = `Successfully imported ${count} students!`; msg.className = 'msg success';
          refreshClassStudents();
        } catch (err) {
          msg.textContent = err.message; msg.className = 'msg error';
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-upload"></i> Import';
        }
      };
      reader.readAsArrayBuffer(file);
    });

    $('#add-student-btn').addEventListener('click', async (e) => {
      const name = $('#student-name').value.trim();
      const email = $('#student-email').value.trim();
      const msg = $('#student-msg');
      if (!name) { msg.textContent = 'Student name is required.'; msg.className = 'msg error'; return; }
      
      const btn = e.target;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
      
      try {
        const snap = await getCountFromServer(collection(db, "students"));
        const count = snap.data().count + 1;
        const studentId = `SASS-${new Date().getFullYear()}-${String(count).padStart(4,'0')}`;
        await addDoc(collection(db, "students"), { name, email, studentId, grade, section });
        msg.textContent = `Student added: ${studentId}`; msg.className = 'msg success';
        $('#student-name').value = '';
        $('#student-email').value = '';
        refreshClassStudents();
      } catch (err) {
        msg.textContent = 'Error adding student.'; msg.className = 'msg error';
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-plus"></i> Enroll Student';
        setTimeout(() => { msg.className = 'msg'; }, 3000);
      }
    });
  } catch (err) { console.error(err); }
}

async function openStudentEditModal(docId, currentGrade, currentSection) {
  let sectionOptions = '';
  for (let i = 65; i <= 90; i++) sectionOptions += `<option value="${String.fromCharCode(i)}">${String.fromCharCode(i)}</option>`;
  $('#edit-student-section').innerHTML = sectionOptions;

  const studentDoc = await getDoc(doc(db, "students", docId));
  if (!studentDoc.exists()) return;
  const st = studentDoc.data();

  $('#edit-student-id').value = st.studentId || '';
  $('#edit-student-name').value = st.name || '';
  $('#edit-student-email').value = st.email || '';
  $('#edit-student-grade').value = st.grade || '9';
  $('#edit-student-section').value = st.section || 'A';
  $('#edit-student-msg').className = 'msg';

  $('#student-modal').classList.add('active');

  $('#save-student-btn').onclick = async (e) => {
    const name = $('#edit-student-name').value.trim();
    const email = $('#edit-student-email').value.trim();
    const grade = $('#edit-student-grade').value;
    const section = $('#edit-student-section').value;
    if (!name) { $('#edit-student-msg').textContent = 'Name is required.'; $('#edit-student-msg').className = 'msg error'; return; }
    
    e.target.disabled = true;
    e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    
    try {
      await updateDoc(doc(db, "students", docId), { name, email, grade, section });
      $('#edit-student-msg').textContent = 'Student record updated!';
      $('#edit-student-msg').className = 'msg success';
      setTimeout(() => {
        $('#student-modal').classList.remove('active');
        showGroupDetail(currentGrade, currentSection);
      }, 800);
    } catch (err) {
      $('#edit-student-msg').textContent = 'Error: ' + err.message;
      $('#edit-student-msg').className = 'msg error';
    } finally {
      e.target.disabled = false;
      e.target.innerHTML = '<i class="fa-solid fa-save"></i> Save Changes';
    }
  };
}

// ==================== ANNOUNCEMENTS ====================
async function loadAnnouncementsSection() {
  try {
    $('#admin-main').innerHTML = `
      <h2 class="section-title">Announcements Broadcast</h2>
      <div class="card" style="max-width:600px;">
        <h3>Draft New Announcement</h3>
        <div class="form-group"><input type="text" id="ann-title" placeholder="Announcement Title"></div>
        <div class="form-group"><textarea id="ann-content" placeholder="Type the message details here..." rows="4"></textarea></div>
        <button class="btn-primary" id="post-ann-btn"><i class="fa-solid fa-paper-plane"></i> Publish to School</button>
      </div>
      <div class="card" style="max-width:600px;">
        <h3>Recent Broadcasts</h3>
        <div id="ann-list"><div class="spinner-ring" style="margin:20px auto;"></div></div>
      </div>
    `;

    async function refreshAnnouncements() {
      const snap = await getDocs(query(collection(db, "announcements"), orderBy("timestamp", "desc")));
      let html = '';
      if(snap.empty) {
        html = '<p style="color:var(--text2);">No announcements published.</p>';
      } else {
        snap.forEach(doc => {
          const a = doc.data();
          html += `
            <div style="margin-bottom:16px; padding:16px; background:var(--bg); border:1px solid var(--border); border-left:4px solid var(--blue); border-radius:8px;">
              <strong style="font-size:1.1rem; display:block; margin-bottom:6px;">${a.title}</strong>
              <p style="color:var(--text2); line-height:1.5;">${a.content}</p>
              <div style="font-size:0.75rem; color:var(--text2); margin-top:12px; display:flex; justify-content:space-between;">
                <span><i class="fa-solid fa-clock"></i> ${new Date(a.timestamp).toLocaleString()}</span>
                <button class="action-btn btn-del" onclick="deleteAnnouncement('${doc.id}')" style="padding:2px 8px; font-size:0.7rem;">Delete</button>
              </div>
            </div>`;
        });
      }
      $('#ann-list').innerHTML = html;
    }
    
    window.deleteAnnouncement = async (id) => {
      if(confirm('Delete this announcement?')) {
        await deleteDoc(doc(db, "announcements", id));
        refreshAnnouncements();
      }
    };
    
    await refreshAnnouncements();

    $('#post-ann-btn').addEventListener('click', async (e) => {
      const title = $('#ann-title').value.trim();
      const content = $('#ann-content').value.trim();
      if (!title || !content) return;
      e.target.disabled = true;
      e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';
      await addDoc(collection(db, "announcements"), { title, content, timestamp: Date.now() });
      $('#ann-title').value = ''; $('#ann-content').value = '';
      e.target.disabled = false;
      e.target.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publish to School';
      refreshAnnouncements();
    });
  } catch (err) { console.error(err); }
}

// ==================== PERMISSIONS ====================
async function loadPermissionsSection() {
  try {
    $('#admin-main').innerHTML = `
      <h2 class="section-title">Leave Requests</h2>
      <div class="card table-container" style="padding:0;">
        <table>
          <thead><tr><th>Student Name</th><th>Class</th><th>Reason Provided</th><th>Status</th><th>Action</th></tr></thead>
          <tbody id="perm-tbody"><tr><td colspan="5" style="text-align:center;"><div class="spinner-ring" style="margin:20px auto;"></div></td></tr></tbody>
        </table>
      </div>
    `;

    const snap = await getDocs(query(collection(db, "permissions"), orderBy("timestamp", "desc")));
    let rows = '';
    if(snap.empty) {
      rows = '<tr><td colspan="5" style="text-align:center; color:var(--text2);">No pending leave requests.</td></tr>';
    } else {
      snap.forEach(doc => {
        const p = doc.data();
        let statusBadge = '';
        if(p.status === 'approved') statusBadge = `<span style="color:var(--green); font-weight:600;"><i class="fa-solid fa-check"></i> Approved</span>`;
        else statusBadge = `<span style="color:var(--text2);"><i class="fa-solid fa-clock"></i> Pending</span>`;
        
        rows += `<tr>
          <td style="font-weight:500;">${p.studentName || 'Unknown'}</td>
          <td>Grade ${p.grade || '-'} ${p.section || '-'}</td>
          <td style="color:var(--text2); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.reason}">${p.reason || '-'}</td>
          <td>${statusBadge}</td>
          <td style="display:flex; gap:8px;">
            ${p.status !== 'approved' ? `<button class="action-btn btn-save" data-id="${doc.id}" data-action="approve">Approve</button>` : ''}
            <button class="action-btn btn-del" data-id="${doc.id}" data-action="decline">Decline/Remove</button>
          </td>
        </tr>`;
      });
    }
    $('#perm-tbody').innerHTML = rows;

    $('#perm-tbody').addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const docId = btn.dataset.id;
      const action = btn.dataset.action;
      
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      btn.disabled = true;
      
      if (action === 'approve') {
        await updateDoc(doc(db, "permissions", docId), { status: 'approved' });
      } else if (action === 'decline') {
        await deleteDoc(doc(db, "permissions", docId));
      }
      loadPermissionsSection();
    });
  } catch (err) {
    console.error(err);
    $('#admin-main').innerHTML = '<h2 class="section-title">Leave Requests</h2><div class="card"><p class="msg error">Could not load permission requests.</p></div>';
  }
}

// ==================== SETTINGS ====================
async function loadSettingsSection() {
  const adminEmail = auth.currentUser?.email || 'Unknown';
  $('#admin-main').innerHTML = `
    <h2 class="section-title">System Settings</h2>
    
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:24px;">
      <div class="card" style="margin:0;">
        <h3>Admin Profile</h3>
        <p style="margin-bottom:8px;"><strong>Email:</strong> <span style="color:var(--text2);">${adminEmail}</span></p>
        <p><strong>Privileges:</strong> <span style="color:var(--blue); font-weight:600;">System Administrator</span></p>
      </div>
      
      <div class="card" style="margin:0;">
        <h3>Change Password</h3>
        <input type="password" id="new-password" placeholder="New password (min 6 chars)" style="margin-bottom:12px;">
        <button class="btn-primary" id="change-password-btn"><i class="fa-solid fa-key"></i> Update</button>
        <p class="msg" id="password-msg"></p>
      </div>

      <div class="card" style="margin:0;">
        <h3>AI Assistant Configuration</h3>
        <p style="font-size:0.85rem; color:var(--text2); margin-bottom:12px;">Configure the Gemini API key used by the school AI assistant.</p>
        <input type="text" id="gemini-key" placeholder="Paste Gemini API Key here..." style="margin-bottom:12px;">
        <button class="btn-primary" id="save-api-key-btn"><i class="fa-solid fa-save"></i> Save API Key</button>
        <p class="msg" id="api-key-msg"></p>
      </div>

      <div class="card" style="margin:0; border-color:var(--red);">
        <h3 style="color:var(--red);"><i class="fa-solid fa-triangle-exclamation"></i> Danger Zone</h3>
        <p style="font-size:0.85rem; color:var(--text2); margin-bottom:12px;">Wipes all school data (Students, Teachers, Marks, Chat, Classes). Admin accounts remain.</p>
        <button class="btn-primary btn-danger" id="reset-firestore-btn"><i class="fa-solid fa-trash"></i> Factory Reset Data</button>
        <p class="msg" id="reset-msg"></p>
      </div>
    </div>
  `;

  try {
    const docSnap = await getDoc(doc(db, "settings", "api_keys"));
    if (docSnap.exists()) {
      $('#gemini-key').value = docSnap.data().gemini || docSnap.data().openrouter || '';
    }
  } catch (e) { console.error(e); }

  $('#save-api-key-btn').addEventListener('click', async (e) => {
    const key = $('#gemini-key').value.trim();
    const msg = $('#api-key-msg');
    if (!key) { msg.textContent = 'Please enter a valid API key.'; msg.className = 'msg error'; return; }
    
    e.target.disabled = true;
    e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    try {
      await setDoc(doc(db, "settings", "api_keys"), { gemini: key }, { merge: true });
      msg.textContent = 'API key updated securely!'; msg.className = 'msg success';
    } catch (err) {
      msg.textContent = 'Error: ' + err.message; msg.className = 'msg error';
    } finally {
      e.target.disabled = false;
      e.target.innerHTML = '<i class="fa-solid fa-save"></i> Save API Key';
    }
  });

  $('#change-password-btn').addEventListener('click', async (e) => {
    const newPass = $('#new-password').value.trim();
    const msg = $('#password-msg');
    if (newPass.length < 6) { msg.textContent = 'Password must be at least 6 characters.'; msg.className = 'msg error'; return; }
    
    e.target.disabled = true;
    e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
    try {
      await updatePassword(auth.currentUser, newPass);
      msg.textContent = 'Password updated successfully!'; msg.className = 'msg success';
      $('#new-password').value = '';
    } catch (err) { 
      msg.textContent = err.message; msg.className = 'msg error'; 
    } finally {
      e.target.disabled = false;
      e.target.innerHTML = '<i class="fa-solid fa-key"></i> Update';
    }
  });

  // Danger Zone - Added 'registrations' to collections array
  $('#reset-firestore-btn').addEventListener('click', async (e) => {
    const confirmMsg = "CRITICAL WARNING:\n\nYou are about to DELETE ALL students, teachers, marks, classes, registrations, and settings from the database.\n\nType 'CONFIRM' to proceed.";
    if (prompt(confirmMsg) !== 'CONFIRM') return;

    const collections = ['teachers', 'students', 'groups', 'marks', 'announcements', 'permissions', 'subjects', 'chat', 'ai_chats', 'settings', 'registrations']; // NEW
    const msg = $('#reset-msg');
    
    e.target.disabled = true;
    e.target.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> DELETING DATA...';

    try {
      for (const col of collections) {
        const snap = await getDocs(collection(db, col));
        const batch = writeBatch(db);
        let opCount = 0;
        snap.forEach(doc => {
          batch.delete(doc.ref);
          opCount++;
          if(opCount === 500) { batch.commit(); opCount = 0; }
        });
        if(opCount > 0) await batch.commit();
      }
      msg.textContent = 'SYSTEM RESET COMPLETE. All non-admin data cleared.';
      msg.className = 'msg success';
    } catch (err) {
      msg.textContent = 'Error: ' + err.message;
      msg.className = 'msg error';
    } finally {
      e.target.disabled = false;
      e.target.innerHTML = '<i class="fa-solid fa-trash"></i> Factory Reset Data';
    }
  });
}

window.closeModal = (id) => document.getElementById(id)?.classList.remove('active');
