import { firebaseConfig } from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let participants = [];
let categories = [];
let skills = [];
let completions = [];
let selectedParticipant = null;

const $ = id => document.getElementById(id);

onSnapshot(collection(db, "participants"), snap => {
  participants = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderParticipants();
});

onSnapshot(collection(db, "categories"), snap => {
  categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProfile();
});

onSnapshot(collection(db, "skills"), snap => {
  skills = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProfile();
});

onSnapshot(collection(db, "completions"), snap => {
  completions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProfile();
});

$("searchParticipant").oninput = renderParticipants;

function renderParticipants() {
  const search = $("searchParticipant").value.toLowerCase();
  $("participants").innerHTML = "";

  participants
    .filter(p => p.name.toLowerCase().includes(search))
    .forEach(p => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<strong>${p.name}</strong>`;
      card.onclick = () => openParticipant(p);
      $("participants").appendChild(card);
    });
}

function openParticipant(participant) {
  selectedParticipant = participant;
  $("profilePanel").classList.remove("hidden");
  renderProfile();
}

function renderProfile() {
  if (!selectedParticipant) return;

  $("profileName").textContent = selectedParticipant.name;

  const completedForParticipant = completions.filter(
    c => c.participantId === selectedParticipant.id
  );

  const completedSkillIds = completedForParticipant.map(c => c.skillId);

  const completedCount = completedSkillIds.length;
  const totalSkills = skills.length;

  const totalXP = completedForParticipant.reduce((sum, c) => {
    const skill = skills.find(s => s.id === c.skillId);
    return sum + (skill?.xp || 0);
  }, 0);

  const percent = totalSkills
    ? Math.round((completedCount / totalSkills) * 100)
    : 0;

  $("profileStats").textContent =
    `${completedCount}/${totalSkills} skills completed • ${totalXP} XP`;

  $("progressBar").style.width = percent + "%";

  renderTree(completedSkillIds);
}

function renderTree(completedSkillIds) {
  const tree = $("treeView");
  tree.innerHTML = "";

  const root = document.createElement("div");
  root.className = "tree-root";
  root.innerHTML = `🌈 ${selectedParticipant.name}`;
  tree.appendChild(root);

  categories.forEach(category => {
    const categorySkills = skills.filter(s => s.categoryId === category.id);
    if (!categorySkills.length) return;

    const branch = document.createElement("div");
    branch.className = "tree-branch";

    branch.innerHTML = `
      <div class="branch-line"></div>
      <div class="branch-title">${category.name}</div>
      <div class="leaves"></div>
    `;

    const leaves = branch.querySelector(".leaves");

    categorySkills.forEach(skill => {
      const done = completedSkillIds.includes(skill.id);

      const leaf = document.createElement("div");
      leaf.className = done ? "leaf done" : "leaf locked";

      leaf.innerHTML = `
        <span>${done ? "🌿" : "🔒"}</span>
        <strong>${skill.name}</strong>
        <small>${done ? `${skill.xp || 20} XP` : "Working towards"}</small>
      `;

      leaves.appendChild(leaf);
    });

    tree.appendChild(branch);
  });
}
