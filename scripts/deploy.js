async function main() {
  const [deployer] = await ethers.getSigners();
  const TaskManager = await ethers.getContractFactory("TaskManager");
  const taskManager = await TaskManager.deploy();
  // Không cần await taskManager.deployed();
  console.log("Contract deployed to:", taskManager.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});