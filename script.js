import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBRH41bLzdtcyDeXh4v2xlKQtAyFVDRRLQ",
  authDomain: "class-schedule-3f91b.firebaseapp.com",
  projectId: "class-schedule-3f91b",
  storageBucket: "class-schedule-3f91b.appspot.com",
  messagingSenderId: "192570271011",
  appId: "1:192570271011:web:8659ecdc56834155ac1896"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let selectedDate = null;

async function verifyPassword(input) {
  const configDoc = await getDoc(doc(db, "config", "adminPassword"));
  const realPassword = configDoc.exists() ? configDoc.data().value : null;
  return input === realPassword;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (localStorage.getItem("mode") === "dark") {
    document.body.classList.add("dark");
  }
  document.getElementById("dark-mode-toggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("mode", isDark ? "dark" : "light");
  });

  const calendarPage = document.getElementById("calendar-page");
  const detailPage = document.getElementById("day-detail");
  const calendarEl = document.getElementById("calendar");
  const selectedDateEl = document.getElementById("selected-date");
  const eventListEl = document.getElementById("event-list");
  const eventFormArea = document.getElementById("event-form-area");

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const alertBox = document.createElement("div");
  alertBox.id = "today-alert";
  alertBox.style.padding = "10px";
  alertBox.style.marginBottom = "10px";
  alertBox.style.borderRadius = "8px";
  calendarPage.prepend(alertBox);

  const backButton = document.createElement("button");
  backButton.textContent = "← 돌아가기";
  backButton.style.marginBottom = "10px";
  backButton.addEventListener("click", () => {
    detailPage.classList.add("hidden");
    calendarPage.classList.remove("hidden");
    calendar.render();
  });
  detailPage.prepend(backButton);

  document.getElementById("add-event-btn").addEventListener("click", () => {
    eventFormArea.classList.toggle("hidden");
  });

  document.getElementById("event-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const password = document.getElementById("password").value;

    if (!(await verifyPassword(password))) {
      alert("비밀번호가 틀렸습니다.");
      return;
    }

    await addDoc(collection(db, "events"), {
      title,
      description,
      date: selectedDate
    });

    alert("일정 추가 완료");
    document.getElementById("event-form").reset();
    eventFormArea.classList.add("hidden");
    loadEventsForDay(selectedDate);
    updateCalendar();
  });

  async function loadAllEvents() {
    const snapshot = await getDocs(collection(db, "events"));
    const events = [];
    let todayEvents = [];
    let tomorrowEvents = [];

    for (let docItem of snapshot.docs) {
      const data = docItem.data();
      events.push({
        title: data.title,
        start: data.date,
        extendedProps: {
          docId: docItem.id,
          description: data.description || ""
        }
      });

      if (data.date === todayStr) {
        todayEvents.push(data.title);
      } else if (data.date === tomorrowStr) {
        tomorrowEvents.push(data.title);
      }
    }

    const alertMessages = [];
    if (todayEvents.length > 0) alertMessages.push(`📣 오늘 일정: ${todayEvents.join(", ")}`);
    if (tomorrowEvents.length > 0) alertMessages.push(`🔔 내일 일정: ${tomorrowEvents.join(", ")}`);

    if (alertMessages.length > 0) {
      alertBox.innerText = alertMessages.join("\n");
      alertBox.style.display = "block";
    } else {
      alertBox.style.display = "none";
    }

    return events;
  }

  let calendar;
  async function updateCalendar() {
    const events = await loadAllEvents();
    calendar.removeAllEvents();
    calendar.addEventSource(events);
  }

  async function initCalendar() {
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      locale: "ko",
      height: 600,
      fixedWeekCount: true,
      dayMaxEventRows: true,
      dayMaxEvents: true,
      events: await loadAllEvents(),
      dateClick: async function (info) {
        selectedDate = info.dateStr;
        selectedDateEl.innerText = `📌 ${selectedDate} 일정`;
        calendarPage.classList.add("hidden");
        detailPage.classList.remove("hidden");
        eventFormArea.classList.add("hidden");
        loadEventsForDay(selectedDate);
      },
      eventContent: function(arg) {
        return { html: `<div class='fc-event-title'>• ${arg.event.title}</div>` };
      }
    });

    calendar.render();
  }

  await initCalendar();

  async function loadEventsForDay(date) {
    eventListEl.innerHTML = "";

    const q = query(collection(db, "events"), where("date", "==", date));
    const snapshot = await getDocs(q);

    for (let docItem of snapshot.docs) {
      const data = docItem.data();
      const id = docItem.id;

      const li = document.createElement("li");
      const titleSpan = document.createElement("span");
      titleSpan.innerHTML = `<strong>${data.title}</strong><br/><small>${data.description || ""}</small>`;

      const buttons = document.createElement("div");

      const editBtn = document.createElement("button");
      editBtn.textContent = "수정";
      editBtn.style.marginLeft = "8px";
      editBtn.onclick = () => showEditForm(id, data.title, data.description, li, titleSpan);
      buttons.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "삭제";
      deleteBtn.style.marginLeft = "8px";
      deleteBtn.onclick = () => deleteEvent(id);
      buttons.appendChild(deleteBtn);

      li.appendChild(titleSpan);
      li.appendChild(buttons);
      eventListEl.appendChild(li);
    }
  }

  function showEditForm(docId, currentTitle, currentDesc, listItem, titleSpan) {
    const pw = prompt("수정하려면 비밀번호를 입력하세요:");

    verifyPassword(pw).then(async (isValid) => {
      if (!isValid) {
        alert("비밀번호가 틀렸습니다.");
        return;
      }

      const inputTitle = document.createElement("input");
      inputTitle.type = "text";
      inputTitle.value = currentTitle;
      inputTitle.style.marginRight = "10px";

      const inputDesc = document.createElement("input");
      inputDesc.type = "text";
      inputDesc.value = currentDesc || "";
      inputDesc.style.marginRight = "10px";

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "저장";

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "취소";
      cancelBtn.style.marginLeft = "8px";

      titleSpan.replaceWith(inputTitle);
      listItem.insertBefore(inputDesc, listItem.querySelector("div"));

      saveBtn.onclick = async () => {
        const newTitle = inputTitle.value;
        const newDesc = inputDesc.value;
        await updateDoc(doc(db, "events", docId), {
          title: newTitle,
          description: newDesc
        });
        alert("일정이 수정되었습니다.");
        loadEventsForDay(selectedDate);
        updateCalendar();
      };

      cancelBtn.onclick = () => {
        loadEventsForDay(selectedDate);
      };

      const btnContainer = listItem.querySelector("div");
      btnContainer.innerHTML = "";
      btnContainer.appendChild(saveBtn);
      btnContainer.appendChild(cancelBtn);
    });
  }

  async function deleteEvent(docId) {
    const pw = prompt("삭제하려면 비밀번호를 입력하세요:");

    if (!(await verifyPassword(pw))) {
      alert("비밀번호가 틀렸습니다.");
      return;
    }

    const confirmed = confirm("정말 이 일정을 삭제하시겠습니까?");
    if (!confirmed) return;

    await deleteDoc(doc(db, "events", docId));
    alert("일정이 삭제되었습니다.");
    loadEventsForDay(selectedDate);
    updateCalendar();
  }
});
