import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, updatePassword } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { collection, getDocs, query, where, doc, getDoc, writeBatch, getCountFromServer } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ==================== THEME ====================
function updateThemeIcon() {
  const icon = document.querySelector('#theme-toggle i');
  if (!icon) return;
  const current = document.documentElement.getAttribute('data-theme');
  icon.className = current === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}
updateThemeIcon();

document.getElementById('theme-toggle').addEventListener('click', () => {
  const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('sass_theme', newTheme);
  updateThemeIcon();
});

let teacherData = null;

// Hide loader after a timeout (fallback)
setTimeout(() => {
  const loader = $('#loader');
  if (loader && !loader.classList.contains('hidden')) loader.classList.add('hidden');
}, 3000);

function initWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    checkAuth();
  }
}

function checkAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    try {
      const teacherDoc = await getDoc(doc(db, "teachers", user.uid));
      if (!teacherDoc.exists()) {
        await signOut(auth);
        window.location.href = 'login.html';
        return;
      }

      teacherData = teacherDoc.data();
      teacherData.id = teacherDoc.id;

      const headerName = $('#header-teacher-name');
      if (headerName) headerName.textContent = teacherData.name || 'Teacher Portal';

      $('#loader').classList.add('hidden');
      showSection('dashboard');
    } catch (e) {
      console.error('Teacher auth error:', e);
      $('#loader').classList.add('hidden');
      const main = $('#teacher-main');
      if (main) main.innerHTML = `<div class="card"><p class="msg error">Failed to load teacher data: ${e.message}. Please try logging in again.</p></div>`;
    }
  });
}

initWhenReady();

$('#logout-btn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

// Sidebar navigation
document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    showSection(link.dataset.section);
  });
});

function showSection(section) {
  const main = $('#teacher-main');
  if (!main) return;
  main.innerHTML = `<div class="loading-state"><div class="spinner-ring"></div></div>`;
  
  switch(section) {
    case 'dashboard': loadDashboard(); break;
    case 'marks': loadMarksSection(); break;
    case 'settings': loadSettingsSection(); break;
  }
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
  if (!teacherData) {
    $('#teacher-main').innerHTML = '<div class="card"><p style="color:var(--text2);">Teacher data not loaded. Please refresh.</p></div>';
    return;
  }

  try {
    // OPTIMIZATION: Use getCountFromServer instead of getDocs to save massive amounts of Firestore reads.
    const [groupCountSnap, studentCountSnap, marksCountSnap] = await Promise.all([
      getCountFromServer(collection(db, "groups")),
      getCountFromServer(collection(db, "students")),
      getCountFromServer(query(collection(db, "marks"), where("subject", "==", teacherData.subject)))
    ]);

    const classCount = groupCountSnap.data().count;
    const studentCount = studentCountSnap.data().count;
    const marksCount = marksCountSnap.data().count;

    $('#teacher-main').innerHTML = `
      <h2 class="section-title">Welcome back, ${teacherData.name}</h2>
      <div class="card">
        <p style="color:var(--text2); font-size: 0.95rem;">You are managing records for <strong>${teacherData.subject}</strong></p>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <i class="fa-solid fa-door-open"></i>
          <div class="number">${classCount}</div>
          <div class="label">Total Classes</div>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-graduation-cap"></i>
          <div class="number">${studentCount}</div>
          <div class="label">Total Students</div>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-edit"></i>
          <div class="number">${marksCount}</div>
          <div class="label">Marks Entered</div>
        </div>
      </div>
      
      <div class="card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h3>Quick Actions</h3>
          <p style="color:var(--text2); font-size: 0.85rem;">Proceed to the gradebook to enter or update student marks.</p>
        </div>
        <button class="btn-primary" id="go-to-marks"><i class="fa-solid fa-edit"></i> Enter Marks</button>
      </div>
    `;

    $('#go-to-marks').addEventListener('click', () => {
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      const marksLink = document.querySelector('.sidebar-link[data-section="marks"]');
      if (marksLink) marksLink.classList.add('active');
      showSection('marks');
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    $('#teacher-main').innerHTML = `<div class="card"><p class="msg error">Error loading dashboard: ${err.message}</p></div>`;
  }
}

// ==================== MARKS SECTION ====================
async function loadMarksSection() {
  if (!teacherData || !teacherData.subject) {
    $('#teacher-main').innerHTML = '<div class="card"><p class="msg error">Your subject is not set. Please contact an administrator.</p></div>';
    return;
  }

  try {
    const groupSnap = await getDocs(collection(db, "groups"));
    if (groupSnap.empty) {
      $('#teacher-main').innerHTML = `
        <h2 class="section-title">Gradebook</h2>
        <div class="card"><p style="color:var(--text2);">No classes available. Please ask an admin to create classes.</p></div>
      `;
      return;
    }

    let options = '<option value="" disabled selected>-- Select a class --</option>';
    groupSnap.forEach(doc => {
      const g = doc.data();
      options += `<option value="${g.grade}|${g.section}">Grade ${g.grade}${g.section}</option>`;
    });

    $('#teacher-main').innerHTML = `
      <h2 class="section-title">Gradebook – ${teacherData.subject}</h2>
      <div class="card">
        <h3>Select a Class</h3>
        <div class="form-group" style="display:flex; gap:12px; flex-wrap:wrap;">
          <select id="class-select" style="max-width:300px;">${options}</select>
          <button class="btn-primary" id="load-students-btn"><i class="fa-solid fa-users"></i> Load Students</button>
        </div>
      </div>
      <div id="marks-table-container"></div>
    `;

    $('#load-students-btn').addEventListener('click', async () => {
      const classVal = $('#class-select').value;
      if (!classVal) {
        alert("Please select a class first.");
        return;
      }
      const [grade, section] = classVal.split('|');

      $('#marks-table-container').innerHTML = '<div class="loading-state"><div class="spinner-ring"></div><p>Fetching student records...</p></div>';

      try {
        const studentSnap = await getDocs(
          query(collection(db, "students"), where("grade", "==", grade), where("section", "==", section))
        );

        const marksSnap = await getDocs(
          query(collection(db, "marks"),
            where("subject", "==", teacherData.subject),
            where("grade", "==", grade),
            where("section", "==", section))
        );

        const scoreMap = {};
        marksSnap.forEach(doc => {
          const d = doc.data();
          scoreMap[d.studentId] = d.score;
        });

        if (studentSnap.empty) {
          $('#marks-table-container').innerHTML = `<div class="card"><p style="color:var(--text2);">No students found in Grade ${grade}${section}.</p></div>`;
          return;
        }

        let tableHtml = `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <h3>Students in Grade ${grade}${section}</h3>
              <button class="btn-primary" id="save-all-marks"><i class="fa-solid fa-save"></i> Save All Marks</button>
            </div>
            <div class="table-container">
              <table>
                <thead><tr><th>Student ID</th><th>Full Name</th><th style="text-align:center;">Score (out of 100)</th></tr></thead>
                <tbody>
        `;

        studentSnap.forEach(doc => {
          const st = doc.data();
          const studentId = st.studentId || doc.id;
          const currentScore = scoreMap[studentId] !== undefined ? scoreMap[studentId] : '';
          tableHtml += `
            <tr>
              <td style="font-family:monospace; color:var(--text2);">${studentId}</td>
              <td style="font-weight:500;">${st.name}</td>
              <td style="text-align:center;"><input type="number" class="mark-input" data-student-id="${studentId}" value="${currentScore}" min="0" max="100" step="0.1" placeholder="-"></td>
            </tr>
          `;
        });

        tableHtml += `</tbody></table></div>
          <p class="msg" id="marks-msg"></p>
          </div>
        `;

        $('#marks-table-container').innerHTML = tableHtml;

        $('#save-all-marks').addEventListener('click', async (e) => {
          const btn = e.target.closest('button');
          btn.disabled = true;
          btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
          
          const inputs = document.querySelectorAll('.mark-input');
          const batch = writeBatch(db);
          let count = 0;

          try {
            // Existing logic: Delete old marks for this specific subject/grade/section before saving
            const oldMarks = await getDocs(
              query(collection(db, "marks"),
                where("subject", "==", teacherData.subject),
                where("grade", "==", grade),
                where("section", "==", section))
            );
            oldMarks.forEach(doc => batch.delete(doc.ref));

            inputs.forEach(inp => {
              const studentId = inp.dataset.studentId;
              const val = parseFloat(inp.value);
              if (!isNaN(val)) {
                const ref = doc(collection(db, "marks"));
                batch.set(ref, {
                  studentId,
                  subject: teacherData.subject,
                  score: val,
                  grade,
                  section,
                  teacherId: teacherData.id
                });
                count++;
              }
            });

            await batch.commit();
            
            const msgEl = $('#marks-msg');
            msgEl.textContent = `Successfully saved ${count} marks!`;
            msgEl.className = 'msg success';
            setTimeout(() => { msgEl.className = 'msg'; }, 4000);
          } catch (err) {
            $('#marks-msg').textContent = 'Error saving marks: ' + err.message;
            $('#marks-msg').className = 'msg error';
          } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-save"></i> Save All Marks';
          }
        });

      } catch (err) {
        console.error(err);
        $('#marks-table-container').innerHTML = `<div class="card"><p class="msg error">Failed to load students: ${err.message}</p></div>`;
      }
    });

  } catch (err) {
    console.error(err);
    $('#teacher-main').innerHTML = `<h2 class="section-title">Gradebook</h2><div class="card"><p class="msg error">Failed to load classes: ${err.message}</p></div>`;
  }
}

// ==================== SETTINGS ====================
async function loadSettingsSection() {
  $('#teacher-main').innerHTML = `
    <h2 class="section-title">Account Settings</h2>
    
    <div class="card">
      <h3>Profile Information</h3>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:12px;">
        <div><label>Full Name</label><p style="padding:10px 0;">${teacherData.name}</p></div>
        <div><label>Email Address</label><p style="padding:10px 0; color:var(--text2);">${auth.currentUser?.email || 'N/A'}</p></div>
        <div><label>Assigned Subject</label><p style="padding:10px 0; font-weight:600; color:var(--blue);">${teacherData.subject}</p></div>
        <div><label>Teacher Code</label><p style="padding:10px 0; font-family:monospace;">${teacherData.teacherCode}</p></div>
      </div>
    </div>

    <div class="card" style="max-width:500px;">
      <h3>Change Password</h3>
      <div class="form-group" style="margin-top:12px;">
        <label>New Password</label>
        <input type="password" id="new-password" placeholder="Minimum 6 characters">
      </div>
      <button class="btn-primary" id="change-password-btn"><i class="fa-solid fa-key"></i> Update Password</button>
      <p class="msg" id="password-msg"></p>
    </div>

    <div class="card" style="max-width:500px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h3>Interface Theme</h3>
        <p style="color:var(--text2); font-size:0.85rem;">Switch between light and dark mode.</p>
      </div>
      <button class="btn-primary" id="toggle-theme-btn2" style="background:var(--surface); border:1px solid var(--border); color:var(--text);"><i class="fa-solid fa-palette"></i> Toggle</button>
    </div>
  `;

  $('#change-password-btn').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    const newPass = $('#new-password').value.trim();
    const msg = $('#password-msg');
    
    if (newPass.length < 6) { 
      msg.textContent = 'Password must be at least 6 characters.'; 
      msg.className = 'msg error'; 
      return; 
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
    
    try {
      await updatePassword(auth.currentUser, newPass);
      msg.textContent = 'Password successfully updated!'; 
      msg.className = 'msg success';
      $('#new-password').value = '';
    } catch (e) { 
      msg.textContent = e.message; 
      msg.className = 'msg error'; 
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-key"></i> Update Password';
    }
  });

  $('#toggle-theme-btn2').addEventListener('click', () => {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('sass_theme', newTheme);
    updateThemeIcon(); // update global header icon
  });
}
