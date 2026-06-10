import { firebaseConfig } from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-a.pp.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let participants = [];
let categories = [];
let skills = [];
let completions = [];
let selectedParticipant = null;

const $ = id => document.getElementById(id);

$("loginBtn").onclick = async () => {
  await signInWithEmailAndPassword(auth, $("email").value, $("password").value);
};

$("logoutBtn").onclick = async () => {
  await signOut(auth);
};

onAuthStateChanged(auth, user => {
  if (user) {
    $("loginPanel").classList.add("hidden");
    $("appPanel").classList.remove("hidden");
    $("logoutBtn").classList.remove("hidden");
    startListeners();
  } else {
    $("loginPanel").classList.remove("hidden");
    $("appPanel").classList.add("hidden");
    $("logoutBtn").classList.add("hidden");
  }
});

function startListeners() {
  onSnapshot(collection(db, "participants"), snap => {
    participants = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderParticipants();
  });

  onSnapshot(collection(db, "categories"), snap => {
    categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCategoryDropdown();
    renderSkills();
  });

  onSnapshot(collection(db, "skills"), snap => {
    skills = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSkills();
  });

  onSnapshot(collection(db, "completions"), snap => {
    completions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSkills();
  });
}

$("addParticipantBtn").onclick = async () => {
  const name = $("participantName").value.trim();

  const tags = $("participantTags").value
    .split(",")
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);

  if (!name) return;

  await addDoc(collection(db, "participants"), {
    name,
    tags,
    createdAt: serverTimestamp()
  });

  $("participantName").value = "";
  $("participantTags").value = "";
};

$("addCategoryBtn").onclick = async () => {
  const name = $("categoryName").value.trim();
  if (!name) return;

  await addDoc(collection(db, "categories"), {
    name,
    createdAt: serverTimestamp()
  });

  $("categoryName").value = "";
};

$("addSkillBtn").onclick = async () => {
  const categoryId = $("skillCategory").value;
  const name = $("skillName").value.trim();
  const xp = Number($("skillXP").value) || 20;

  if (!categoryId || !name) return;

  await addDoc(collection(db, "skills"), {
    name,
    categoryId,
    xp,
    createdAt: serverTimestamp()
  });

  $("skillName").value = "";
  $("skillXP").value = "";
};

$("searchParticipant").oninput = renderParticipants;

function renderParticipants() {
  const search = $("searchParticipant").value.toLowerCase();
  $("participants").innerHTML = "";

  participants
    .filter(p => p.name.toLowerCase().includes(search))
    .forEach(p => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
  <strong>${p.name}</strong><br>
  <small>${(p.tags || []).join(", ") || "No tags"}</small>
`;
      div.onclick = () => openParticipant(p);
      $("participants").appendChild(div);
    });
}

function openParticipant(p) {
  selectedParticipant = p;
  $("profilePanel").classList.remove("hidden");
  $("profileName").textContent = p.name;
  renderSkills();
}

function renderCategoryDropdown() {
  $("skillCategory").innerHTML = "";

  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.name;
    $("skillCategory").appendChild(option);
  });
}

function renderSkills() {
  if (!selectedParticipant) return;

  $("skillList").innerHTML = "";

  const completedForParticipant = completions.filter(
    c => c.participantId === selectedParticipant.id
  );

  const completedSkillIds = completedForParticipant.map(c => c.skillId);

  const totalXP = completedForParticipant.reduce((sum, c) => {
    const skill = skills.find(s => s.id === c.skillId);
    return sum + (skill?.xp || 0);
  }, 0);

  const percent = skills.length
    ? Math.round((completedSkillIds.length / skills.length) * 100)
    : 0;

  $("profileStats").textContent =
    `${completedSkillIds.length}/${skills.length} skills completed • ${totalXP} XP`;

  $("progressBar").style.width = percent + "%";

  categories.forEach(cat => {
    const groupSkills = skills.filter(s => s.categoryId === cat.id);
    if (!groupSkills.length) return;

    const heading = document.createElement("h3");
    heading.textContent = cat.name;
    $("skillList").appendChild(heading);

    groupSkills.forEach(skill => {
      const done = completedSkillIds.includes(skill.id);

      const div = document.createElement("div");
      div.className = done ? "skill done" : "skill";

      div.innerHTML = `
        <span>
          <strong>${skill.name}</strong><br>
          <small>${skill.xp || 20} XP</small>
        </span>
        <button>${done ? "Undo" : "Unlock"}</button>
      `;

      div.querySelector("button").onclick = () => toggleSkill(skill, done);
      $("skillList").appendChild(div);
    });
  });
}

async function toggleSkill(skill, done) {
  if (!selectedParticipant) return;

  if (done) {
    const completion = completions.find(
      c => c.participantId === selectedParticipant.id && c.skillId === skill.id
    );

    if (completion) {
      await deleteDoc(doc(db, "completions", completion.id));
    }
  } else {
    await addDoc(collection(db, "completions"), {
      participantId: selectedParticipant.id,
      participantName: selectedParticipant.name,
      skillId: skill.id,
      skillName: skill.name,
      completedAt: serverTimestamp()
    });
  }
}
