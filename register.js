import { db } from './firebase-config.js';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ==================== CONFIGURATION ====================
const VERIFY_ET_API_KEY = "VERIFY_BANK_ET_ZLsKKoW3TaSv--LaHaVyHqVc6dMQJIqZGIqitgGDiv7T24jfRQ7Rd0UqlumgBVEu";
const REQUIRED_PHONE_NUMBER = "0940099073";
const REQUIRED_AMOUNT = 1; // Testing amount: 1 Birr
const ACADEMIC_YEAR = "2026";

let currentStudent = null;
let nextGrade = null;
let verifiedTransactionId = null;

let sectionOptions = '<option value="" disabled selected>Choose</option>';
for (let i = 65; i <= 90; i++) sectionOptions += `<option value="${String.fromCharCode(i)}">${String.fromCharCode(i)}</option>`;
$('#search-section').innerHTML = sectionOptions;

function showStep(stepId, navStepNum) {
  $$('.step-content').forEach(el => el.classList.remove('active'));
  $(stepId).classList.add('active');
  if (navStepNum) {
    $$('.step').forEach((el, index) => {
      const stepNum = index + 1;
      el.classList.remove('active', 'completed');
      if (stepNum < navStepNum) el.classList.add('completed');
      else if (stepNum === navStepNum) el.classList.add('active');
    });
  }
}

// ==================== PHASE 1: Find Profile ====================
$('#btn-find-profile').addEventListener('click', async (e) => {
  const grade = $('#search-grade').value;
  const section = $('#search-section').value;
  const name = $('#search-name').value.trim();
  const msg = $('#step1-msg');

  if (!grade || !section || !name) {
    msg.textContent = 'Please fill all fields to search.';
    msg.className = 'msg error';
    return;
  }

  const btn = e.target;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching Database...';
  msg.className = 'msg';

  try {
    const q = query(
      collection(db, "students"), 
      where("grade", "==", grade), 
      where("section", "==", section), 
      where("name", "==", name)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      msg.textContent = 'Student not found. Please check your exact name, grade, and section.';
      msg.className = 'msg error';
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-search"></i> Find My Profile';
      return;
    }

    currentStudent = snap.docs[0].data();
    currentStudent.docId = snap.docs[0].id;
    
    nextGrade = parseInt(currentStudent.grade) + 1;
    if(nextGrade > 12) {
      msg.textContent = 'Grade 12 students cannot register for a new academic year.';
      msg.className = 'msg error';
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-search"></i> Find My Profile';
      return;
    }

    const regQuery = query(
      collection(db, "registrations"), 
      where("studentId", "==", currentStudent.studentId), 
      where("academicYear", "==", ACADEMIC_YEAR)
    );
    const regSnap = await getDocs(regQuery);

    if (!regSnap.empty) {
      $('#success-name').textContent = currentStudent.name;
      $('#success-new-grade').textContent = nextGrade;
      $('#success-reg-num').textContent = currentStudent.studentId;
      $('#success-queue').parentElement.style.display = 'none'; 
      $('.qr-placeholder').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentStudent.studentId}" alt="QR Code" style="border-radius:8px;">`;
      
      document.querySelector('#step-5 h2').textContent = "Already Registered!";
      showStep('#step-5', 5);
      return;
    }

    $('#found-name').textContent = currentStudent.name;
    $('#found-old-class').textContent = `Grade ${currentStudent.grade} ${currentStudent.section}`;
    $('#found-new-grade').textContent = nextGrade;
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-search"></i> Find My Profile';
    showStep('#step-1-5', 1);

  } catch (err) {
    console.error(err);
    msg.textContent = 'Database connection error. Please try again.';
    msg.className = 'msg error';
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-search"></i> Find My Profile';
  }
});

$('#btn-wrong-student').addEventListener('click', () => {
  $('#search-name').value = '';
  currentStudent = null;
  showStep('#step-1', 1);
});

// ==================== PHASE 2: Move to Payment ====================
$('#btn-continue-payment').addEventListener('click', () => {
  document.querySelector('#school-account').textContent = REQUIRED_PHONE_NUMBER;
  document.querySelector('#school-account').closest('.info-box').querySelector('.info-value').textContent = `${REQUIRED_AMOUNT} ETB (Testing)`;
  showStep('#step-2', 2);
});

// ==================== PHASE 3: Strict Payment Verification ====================
$('#btn-verify-payment').addEventListener('click', async (e) => {
  const txId = $('#tx-id').value.trim();
  const msg = $('#step2-msg');

  if (!txId) {
    msg.textContent = 'Please enter your Telebirr Transaction ID.';
    msg.className = 'msg error';
    return;
  }

  const btn = e.target;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying with Telebirr...';
  msg.className = 'msg';

  try {
    // 1. DUPLICATE CHECK: Verifies if the transaction was already saved to Firebase
    const txQuery = query(collection(db, "registrations"), where("transactionId", "==", txId));
    const txSnap = await getDocs(txQuery);
    
    if (!txSnap.empty) {
      msg.textContent = '❌ THIS PAYMENT HAS ALREADY BEEN USED.';
      msg.className = 'msg error';
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Verify Payment';
      return;
    }

    const targetUrl = "https://verify.et/api/verify?waitMs=5000";
    const res = await fetch(`https://cors-anywhere.herokuapp.com/${targetUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": VERIFY_ET_API_KEY
      },
      body: JSON.stringify({
        bank: "telebirr",
        transactionNumber: txId,
        settlementAccount: REQUIRED_PHONE_NUMBER
      })
    });
    
    const responseData = await res.json();
    console.log("FULL VERIFY.ET RESPONSE:", responseData); 

    // EXTRACT DATA FROM ARRAY (List) OR OBJECT
    let txDetails = responseData;
    if (Array.isArray(responseData.data) && responseData.data.length > 0) {
      txDetails = responseData.data[0]; 
    } else if (typeof responseData.data === 'string') {
      try { txDetails = JSON.parse(responseData.data); } catch(e){}
    } else if (responseData.data?.data) {
      txDetails = responseData.data.data;
    } else if (responseData.data) {
      txDetails = responseData.data;
    }

    if (Array.isArray(txDetails) && txDetails.length > 0) {
      txDetails = txDetails[0];
    }

    const apiMsg = String(responseData.message || txDetails.message || "").toLowerCase();
    const isSuccess = responseData.success || responseData.status === 'success' || apiMsg.includes("completed") || apiMsg.includes("verified");

    if (isSuccess) {
      
      const amountPaid = parseFloat(txDetails.amount || txDetails.totalAmount || 0);
      const receiverName = String(txDetails.receiver || txDetails.receiverName || txDetails.recipient || txDetails.merchantName || "").toLowerCase();
      const settledPhone = String(txDetails.settlementAccount || txDetails.receiverPhone || txDetails.accountNumber || "");
      const dateStr = txDetails.date || txDetails.completedAt || txDetails.transactionDate || "";

      if (amountPaid === 0 && receiverName === "") {
        console.error("Still missing payload:", txDetails);
        msg.textContent = `❌ API verified the transaction, but couldn't read the exact amount. Check Console.`;
        msg.className = 'msg error';
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Verify Payment';
        return;
      }

      // ENFORCEMENT 1: Exact Amount
      if (amountPaid !== REQUIRED_AMOUNT) {
        msg.textContent = `❌ Invalid amount. Expected ${REQUIRED_AMOUNT} Birr, but found ${amountPaid} Birr.`;
        msg.className = 'msg error';
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Verify Payment';
        return;
      }

      // ENFORCEMENT 2: Exact Receiver Name
      if (!receiverName.includes("fikir") && !receiverName.includes("habtamu")) {
        msg.textContent = `❌ Invalid receiver. The payment was sent to "${receiverName || 'Unknown'}" instead of Fikir Habtamu.`;
        msg.className = 'msg error';
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Verify Payment';
        return;
      }

      // ENFORCEMENT 3: Phone Number Check
      if (settledPhone && !settledPhone.includes(REQUIRED_PHONE_NUMBER)) {
        msg.textContent = `❌ Invalid account. The payment was sent to ${settledPhone} instead of ${REQUIRED_PHONE_NUMBER}.`;
        msg.className = 'msg error';
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Verify Payment';
        return;
      }

      verifiedTransactionId = txId;
      $('#confirm-name').textContent = currentStudent.name;
      $('#confirm-old-class').textContent = `Grade ${currentStudent.grade} ${currentStudent.section}`;
      $('#confirm-new-grade').textContent = nextGrade;
      
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Verify Payment';
      showStep('#step-3', 3);

    } else {
      msg.textContent = `❌ API Rejected: ${responseData.message || "Transaction not found."}`;
      msg.className = 'msg error';
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Verify Payment';
    }

  } catch (err) {
    console.error("API Error:", err);
    msg.textContent = 'Verification service temporarily unavailable or CORS blocked. Ensure you activated the cors-anywhere demo.';
    msg.className = 'msg error';
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Verify Payment';
  }
});

// ==================== PHASE 4: Information Confirm ====================
$('#btn-confirm-info').addEventListener('click', () => {
  showStep('#step-4', 4);
});

// ==================== PHASE 5: Card Order & Finalize ====================
$('#btn-order-card').addEventListener('click', async (e) => {
  const btn = e.target;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Finalizing Registration...';

  try {
    await addDoc(collection(db, "registrations"), {
      studentId: currentStudent.studentId,
      name: currentStudent.name,
      previousGrade: currentStudent.grade,
      previousSection: currentStudent.section,
      nextGrade: nextGrade,
      academicYear: ACADEMIC_YEAR,
      paymentStatus: "VERIFIED",
      transactionId: verifiedTransactionId, // This marks the transaction as used in Firestore
      registrationStatus: "COMPLETED",
      photoStatus: "PENDING",
      cardStatus: "PENDING",
      timestamp: serverTimestamp()
    });

    $('#success-name').textContent = currentStudent.name;
    $('#success-new-grade').textContent = nextGrade;
    $('#success-reg-num').textContent = currentStudent.studentId;
    $('#success-queue').parentElement.style.display = 'none'; 
    $('.qr-placeholder').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentStudent.studentId}" alt="QR Code" style="border-radius:8px;">`;

    showStep('#step-5', 5);

  } catch (err) {
    console.error(err);
    alert('Failed to save registration to database. Check your internet connection.');
    btn.disabled = false;
    btn.innerHTML = 'Order My Student Card & Finish <i class="fa-solid fa-flag-checkered"></i>';
  }
});
