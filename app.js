const SUPABASE_URL = "https://kezskesguutvkzkgbmto.supabase.co";
const SUPABASE_KEY = "sb_publishable_Nfptf1zo2bBteS4eHDMn7g_u1g6loSt";
const USER_ID = "7ddde65a-d770-4682-be2d-86ac7e4b2a52";

let currentTask = null;

async function callSupabase(functionName, body) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/${functionName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return await response.json();
}


// -------------------------
// GET NEXT TASK
// -------------------------

async function getNextTask() {
  try {
    const result = await callSupabase(
      "get_next_task",
      {
        p_user_id: USER_ID,
        p_available_minutes: 30,
        p_energy_level: "normal",
        p_minimum_day: false
      }
    );

    if (!result || result.length === 0) {
      showNoTasks();
      return;
    }

    currentTask = result[0];

    document.getElementById("task-title").textContent =
      currentTask.title;

    document.getElementById("task-category").textContent =
      currentTask.category || "General";

    document.getElementById("task-time").textContent =
      `${currentTask.estimated_minutes || 0} minutes`;

    document.getElementById("task-reason").textContent =
      currentTask.reason || "";

  } catch (error) {
    console.error(error);

    document.getElementById("task-title").textContent =
      "Something went wrong";

    document.getElementById("task-reason").textContent =
      error.message;
  }
}


function showNoTasks() {
  currentTask = null;

  document.getElementById("task-title").textContent =
    "You're all caught up!";

  document.getElementById("task-category").textContent = "";

  document.getElementById("task-time").textContent = "";

  document.getElementById("task-reason").textContent =
    "Nothing needs your attention right now.";
}


// -------------------------
// COMPLETE TASK
// -------------------------

async function completeCurrentTask() {
  if (!currentTask) return;

  try {
    await callSupabase(
      "complete_task",
      {
        p_user_id: USER_ID,
        p_task_id: currentTask.task_id
      }
    );

    await getNextTask();

  } catch (error) {
    console.error(error);

    alert("I couldn't mark that task as complete.");
  }
}


// -------------------------
// SKIP TASK
// -------------------------

function openSkipModal() {
  if (!currentTask) return;

  document
    .getElementById("skip-modal")
    .classList.remove("hidden");
}


function closeSkipModal() {
  document
    .getElementById("skip-modal")
    .classList.add("hidden");
}


async function skipCurrentTask(reason) {
  if (!currentTask) return;

  try {
    await callSupabase(
      "skip_task",
      {
        p_user_id: USER_ID,
        p_task_id: currentTask.task_id,
        p_reason: reason,
        p_available_minutes: 30,
        p_energy_level: "normal"
      }
    );

    closeSkipModal();

    await getNextTask();

  } catch (error) {
    console.error(error);

    alert("I couldn't reschedule that task.");
  }
}


// -------------------------
// ADD TASK
// -------------------------

function openAddModal() {
  document
    .getElementById("add-modal")
    .classList.remove("hidden");

  document
    .getElementById("new-task-input")
    .focus();
}


function closeAddModal() {
  document
    .getElementById("add-modal")
    .classList.add("hidden");

  document
    .getElementById("new-task-input")
    .value = "";
}


async function addNewTask() {

  const input =
    document.getElementById("new-task-input");

  const title =
    input.value.trim();

  if (!title) return;

  try {

await callSupabase(
  "add_task",
  {
    p_user_id: USER_ID,
    p_title: title
  }
);


    closeAddModal();

    await getNextTask();


  } catch (error) {

    console.error(error);

    alert(
      "I couldn't add that task: " +
      error.message
    );
  }
}


// -------------------------
// BUTTONS
// -------------------------

document
  .getElementById("done-button")
  .addEventListener(
    "click",
    completeCurrentTask
  );


document
  .getElementById("skip-button")
  .addEventListener(
    "click",
    openSkipModal
  );


document
  .getElementById("cancel-skip")
  .addEventListener(
    "click",
    closeSkipModal
  );


document
  .querySelectorAll(".reason-button")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const reason =
          button.dataset.reason;

        skipCurrentTask(reason);
      }
    );

  });


document
  .getElementById("add-button")
  .addEventListener(
    "click",
    openAddModal
  );


document
  .getElementById("cancel-add")
  .addEventListener(
    "click",
    closeAddModal
  );


document
  .getElementById("save-task-button")
  .addEventListener(
    "click",
    addNewTask
  );


// -------------------------
// START APP
// -------------------------

getNextTask();
