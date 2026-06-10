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

  $("completedSkills").innerHTML = "";
  $("lockedSkills").innerHTML = "";

  categories.forEach(category => {
    const categorySkills = skills.filter(s => s.categoryId === category.id);
    if (!categorySkills.length) return;

    const completedInCategory = categorySkills.filter(s =>
      completedSkillIds.includes(s.id)
    );

    const lockedInCategory = categorySkills.filter(s =>
      !completedSkillIds.includes(s.id)
    );

    if (completedInCategory.length) {
      const heading = document.createElement("h3");
      heading.textContent = category.name;
      $("completedSkills").appendChild(heading);

      completedInCategory.forEach(skill => {
        const div = document.createElement("div");
        div.className = "skill done";
        div.innerHTML = `
          <span>
            <strong>✅ ${skill.name}</strong><br>
            <small>${skill.xp || 20} XP</small>
          </span>
        `;
        $("completedSkills").appendChild(div);
      });
    }

    if (lockedInCategory.length) {
      const heading = document.createElement("h3");
      heading.textContent = category.name;
      $("lockedSkills").appendChild(heading);

      lockedInCategory.forEach(skill => {
        const div = document.createElement("div");
        div.className = "skill";
        div.innerHTML = `
          <span>
            <strong>🔒 ${skill.name}</strong><br>
            <small>Working towards</small>
          </span>
        `;
        $("lockedSkills").appendChild(div);
      });
    }
  });
}
