// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TaskManager {
    // Data structure for a task
    struct Task {
        uint256 id;
        address creator;
        string title;
        string content;
        string fileUrl; // IPFS hash or URL of the file
        address[] assignedTo;
        bool completed;
        uint256 timestamp;
    }

    // Mapping to store tasks by ID
    mapping(uint256 => Task) public tasks;
    // Mapping to track task IDs for each user (creator or assignee)
    mapping(address => uint256[]) private userTaskIds;
    // Counter for total number of tasks
    uint256 private taskCount;

    // Events to notify task creation, completion, or deletion
    event TaskCreated(uint256 taskId, address creator, string title, string fileUrl, address[] assignedTo, uint256 timestamp);
    event TaskCompleted(uint256 taskId, address updatedBy, uint256 timestamp);
    event TaskDeleted(uint256 taskId, address deletedBy, uint256 timestamp);

    // Constructor to initialize the contract
    constructor() {
        taskCount = 0;
    }

    // Create a new task
    function createTask(
        string memory _title,
        string memory _content,
        string memory _fileUrl,
        address[] memory _assignedTo
    ) public {
        require(bytes(_title).length > 0, "Title must not be empty");
        require(bytes(_content).length > 0, "Content must not be empty");
        require(bytes(_fileUrl).length <= 100, "File URL too long");

        // Validate assignedTo addresses
        for (uint256 i = 0; i < _assignedTo.length; i++) {
            require(_assignedTo[i] != address(0), "Invalid assignee address");
            require(_assignedTo[i] != msg.sender, "Cannot assign to creator");
            // Check for duplicates
            for (uint256 j = i + 1; j < _assignedTo.length; j++) {
                require(_assignedTo[i] != _assignedTo[j], "Duplicate assignee address");
            }
        }

        uint256 newTaskId = taskCount++;
        tasks[newTaskId] = Task(
            newTaskId,
            msg.sender,
            _title,
            _content,
            _fileUrl,
            _assignedTo,
            false,
            block.timestamp
        );

        // Add taskId to creator's task list
        userTaskIds[msg.sender].push(newTaskId);

        // Add taskId to assignees' task lists (only unique addresses)
        for (uint256 i = 0; i < _assignedTo.length; i++) {
            if (_assignedTo[i] != address(0)) {
                userTaskIds[_assignedTo[i]].push(newTaskId);
            }
        }

        emit TaskCreated(newTaskId, msg.sender, _title, _fileUrl, _assignedTo, block.timestamp);
    }

    // Complete a task (only creator or assignee can complete)
    function completeTask(uint256 _taskId) public {
        require(_taskId < taskCount, "Invalid task ID");
        Task storage task = tasks[_taskId];
        require(msg.sender == task.creator || isAssigned(msg.sender, task.assignedTo), "Not authorized to complete");
        require(!task.completed, "Task already completed");

        task.completed = true;
        emit TaskCompleted(_taskId, msg.sender, block.timestamp);
    }

    // Confirm task completion (view function for creator or assignee)
    function confirmTaskCompleted(uint256 _taskId) public view returns (bool) {
        require(_taskId < taskCount, "Invalid task ID");
        Task memory task = tasks[_taskId];
        require(task.completed, "Task is not completed yet");
        require(msg.sender == task.creator || isAssigned(msg.sender, task.assignedTo), "Not authorized to confirm");
        return true;
    }

    // Delete a task (only creator can delete)
    function deleteTask(uint256 _taskId) public {
        require(_taskId < taskCount, "Invalid task ID");
        Task storage task = tasks[_taskId];
        require(msg.sender == task.creator, "Only creator can delete");

        // Remove taskId from userTaskIds BEFORE clearing task data
        removeTaskIdFromUsers(_taskId, task.creator, task.assignedTo);

        // Clear task data after removing from userTaskIds
        task.title = "";
        task.content = "";
        task.fileUrl = "";
        task.assignedTo = new address[](0);
        task.completed = false;

        emit TaskDeleted(_taskId, msg.sender, block.timestamp);
    }

    // Get task details
    function getTask(uint256 _taskId) public view returns (
        uint256 id,
        address creator,
        string memory title,
        string memory content,
        string memory fileUrl,
        address[] memory assignedTo,
        bool completed,
        uint256 timestamp
    ) {
        require(_taskId < taskCount, "Invalid task ID");
        Task memory task = tasks[_taskId];
        return (
            task.id,
            task.creator,
            task.title,
            task.content,
            task.fileUrl,
            task.assignedTo,
            task.completed,
            task.timestamp
        );
    }

    // Get task IDs for a user
    function getUserTaskIds(address _user) public view returns (uint256[] memory) {
        return userTaskIds[_user];
    }

    // Check if a user is assigned to a task
    function isAssigned(address _user, address[] memory _assignedTo) internal pure returns (bool) {
        for (uint256 i = 0; i < _assignedTo.length; i++) {
            if (_assignedTo[i] == _user) {
                return true;
            }
        }
        return false;
    }

    // Get total task count
    function getTaskCount() public view returns (uint256) {
        return taskCount;
    }

    // Helper function to remove taskId from userTaskIds
    function removeTaskIdFromUsers(uint256 _taskId, address _creator, address[] memory _assignedTo) private {
        removeTaskIdFromUser(_taskId, _creator);
        for (uint256 i = 0; i < _assignedTo.length; i++) {
            if (_assignedTo[i] != address(0)) {
                removeTaskIdFromUser(_taskId, _assignedTo[i]);
            }
        }
    }

    // Helper function to remove a taskId from a user's task list
    function removeTaskIdFromUser(uint256 _taskId, address _user) private {
        uint256[] storage taskIds = userTaskIds[_user];
        for (uint256 i = 0; i < taskIds.length; i++) {
            if (taskIds[i] == _taskId) {
                taskIds[i] = taskIds[taskIds.length - 1];
                taskIds.pop();
                break;
            }
        }
    }
}