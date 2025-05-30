import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import axios from 'axios';

const contractABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "_title", "type": "string" },
      { "internalType": "string", "name": "_content", "type": "string" },
      { "internalType": "string", "name": "_fileUrl", "type": "string" },
      { "internalType": "address[]", "name": "_assignedTo", "type": "address[]" }
    ],
    "name": "createTask",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_taskId", "type": "uint256" } 
    ],
    "name": "completeTask",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_taskId", "type": "uint256" }
    ],
    "name": "deleteTask",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_taskId", "type": "uint256" }
    ],
    "name": "getTask",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "address", "name": "creator", "type": "address" },
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "string", "name": "content", "type": "string" },
      { "internalType": "string", "name": "fileUrl", "type": "string" },
      { "internalType": "address[]", "name": "assignedTo", "type": "address[]" },
      { "internalType": "bool", "name": "completed", "type": "bool" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "_user", "type": "address" }
    ],
    "name": "getUserTaskIds",
    "outputs": [
      { "internalType": "uint256[]", "name": "", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTaskCount",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_taskId", "type": "uint256" }
    ],
    "name": "confirmTaskCompleted",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
const contractAddress = '0x2B8f2bBEE735b701A20C9d7f395D50D69523De17';

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [tasks, setTasks] = useState([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskContent, setTaskContent] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [assignedTo, setAssignedTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        toast.error('Vui lòng cài đặt MetaMask!');
        return;
      }
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0xaa36a7') {
        toast.error('Vui lòng chuyển mạng MetaMask sang Sepolia!');
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setProvider(provider);
      setSigner(signer);
      setContract(contract);
      setAccount(accounts[0]);
      await fetchUserTasks(accounts[0], contract);
    } catch (error) {
      toast.error('Kết nối ví thất bại: ' + (error?.message || 'Không rõ nguyên nhân'));
    }
  };

  const fetchUserTasks = async (userAddress, contractInstance) => {
    setLoading(true);
    try {
      const taskIds = await contractInstance.getUserTaskIds(userAddress);
      const tasksData = await Promise.all(taskIds.map(async (id) => {
        const task = await contractInstance.getTask(id);
        if (!task.title) return null;
        return {
          id: Number(task.id),
          creator: task.creator,
          title: task.title,
          content: task.content,
          assignedTo: task.assignedTo,
          completed: task.completed,
          timestamp: new Date(Number(task.timestamp) * 1000).toLocaleString(),
          fileUrl: task.fileUrl // Đảm bảo lấy fileUrl từ contract
        };
      }));
      const filteredTasks = tasksData.filter(task => task !== null).sort((a, b) => b.id - a.id);
      setTasks(filteredTasks);
    } catch (error) {
      toast.error('Lỗi tải danh sách công việc!');
    }
    setLoading(false);
  };

  // Hàm upload file lên Pinata
  const uploadFileToIPFS = async (file) => {
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    const data = new FormData();
    data.append('file', file);
    try {
      const res = await axios.post(url, data, {
        maxContentLength: 'Infinity',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
          pinata_api_key: '4074f72dd4c706bcd950',
          pinata_secret_api_key: 'b4a1de700ac241f4202c266f1e64723199d3c09d28f358231b08195fd6e14c12',
        },
      });
      return `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
    } catch (err) {          
      toast.error('Upload file thất bại!');
      return '';
    }
  };

  const saveTask = async () => {
    if (!contract || !taskTitle || !taskContent) {
      toast.error('Vui lòng nhập tiêu đề và mô tả công việc.');
      return;
    }
    let fileUrl = '';
    if (file) {
      fileUrl = await uploadFileToIPFS(file);
      if (!fileUrl) return;
    }
    try {
      const addresses = assignedTo.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0);
      const tx = await contract.createTask(taskTitle, taskContent, fileUrl, addresses);
      await tx.wait();
      toast.success('Đã thêm công việc mới!');
      setTaskTitle('');
      setTaskContent('');
      setAssignedTo('');
      setFile(null);
      setEditingTaskId(null);
      await fetchUserTasks(account, contract);
    } catch (error) {
      toast.error('Thêm công việc thất bại.');
    }
  };

  const updateTask = async () => {
    if (!contract || !taskTitle || !taskContent) {
      toast.error('Vui lòng nhập tiêu đề và mô tả công việc.');
      return;
    }
    let fileUrl = '';
    if (file) {
      fileUrl = await uploadFileToIPFS(file);
      if (!fileUrl) return;
    }
    try {
      await contract.deleteTask(editingTaskId);
      const addresses = assignedTo.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0);
      const tx = await contract.createTask(taskTitle, taskContent, fileUrl, addresses);
      await tx.wait();
      toast.success('Đã cập nhật công việc!');
      setTaskTitle('');
      setTaskContent('');
      setAssignedTo('');
      setFile(null);
      setEditingTaskId(null);
      await fetchUserTasks(account, contract);
    } catch (error) {
      toast.error('Cập nhật công việc thất bại.');
    }
  };

  const completeTask = async (taskId) => {
    try {
      const tx = await contract.completeTask(taskId);
      await tx.wait();
      toast.success('Đã hoàn thành công việc!');
      await fetchUserTasks(account, contract);
    } catch (error) {
      toast.error('Hoàn thành công việc thất bại.');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const tx = await contract.deleteTask(taskId);
      await tx.wait();
      toast.success('Đã xóa công việc!');
      await fetchUserTasks(account, contract);
    } catch (error) {
      toast.error('Xóa công việc thất bại.');
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length === 0) {
          setAccount('');
          setTasks([]);
          toast.info('Đã ngắt kết nối MetaMask.');
        } else {
          setAccount(accounts[0]);
          // eslint-disable-next-line no-unused-vars
          const provider = new ethers.BrowserProvider(window.ethereum);
          // eslint-disable-next-line no-unused-vars
          const signer = await provider.getSigner();
          const contract = new ethers.Contract(contractAddress, contractABI, signer);
          setProvider(provider);
          setSigner(signer);
          setContract(contract);
          await fetchUserTasks(accounts[0], contract);
          toast.success('Đã chuyển tài khoản MetaMask!');
        }
      });
      window.ethereum.on('chainChanged', async (chainId) => {
        if (chainId !== '0xaa36a7') {
          toast.error('Vui lòng chuyển mạng MetaMask sang Sepolia!');
          setAccount('');
          setTasks([]);
          setProvider(null);
          setSigner(null);
          setContract(null);
        } else if (account) {
          // eslint-disable-next-line no-unused-vars
          const provider = new ethers.BrowserProvider(window.ethereum);
          // eslint-disable-next-line no-unused-vars
          const signer = await provider.getSigner();
          const contract = new ethers.Contract(contractAddress, contractABI, signer);
          setProvider(provider);
          setSigner(signer);
          setContract(contract);
          await fetchUserTasks(account, contract);
        }
      });
    }
  }, [account]);

  const tasksFiltered = tasks.filter(task => {
    const statusMatch = filterStatus === 'all' || (filterStatus === 'completed' && task.completed) || (filterStatus === 'uncompleted' && !task.completed);
    const typeMatch = filterType === 'all' || 
      (filterType === 'created' && task.creator.toLowerCase() === account.toLowerCase()) || 
      (filterType === 'shared' && task.assignedTo && task.assignedTo.map(a => a.toLowerCase()).includes(account.toLowerCase()));
    return statusMatch && typeMatch;
  });

  return (
    <div className="app-container">
      <ToastContainer />
      <h1 className="app-title">
        <span role="img" aria-label="task">📝</span> TASK MANAGER
      </h1>
      <div className="wallet-status">
        {account ? (
          <div className="connected-wallet">
            <span className="status-indicator"></span>
            Đã kết nối: <span className="account-address">{account.slice(0, 6)}...{account.slice(-4)}</span>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="connect-button"
          >
            Kết nối MetaMask
          </button>
        )}
      </div>
      <div className="task-form">
        <h2 className="form-title">
          <span className="form-icon">+</span> Thêm công việc mới
        </h2>
        <input
          type="text"
          placeholder="Tiêu đề công việc"
          value={taskTitle}
          onChange={e => setTaskTitle(e.target.value)}
          className="form-input"
        />
        <textarea
          placeholder="Mô tả chi tiết"
          value={taskContent}
          onChange={e => setTaskContent(e.target.value)}
          className="form-textarea"
        />
        <input
          type="file"
          onChange={e => setFile(e.target.files[0])}
          className="form-input"
        />
        <input
          type="text"
          placeholder="Danh sách địa chỉ ví được chia sẻ (cách nhau dấu phẩy)"
          value={assignedTo}
          onChange={e => setAssignedTo(e.target.value)}
          className="form-input"
        />
        <button
          onClick={editingTaskId !== null ? updateTask : saveTask}
          className="form-button"
        >
          {editingTaskId !== null ? 'Cập nhật' : 'Thêm mới'}
        </button>
      </div>
      <div className="task-list">
        <h2 className="list-title">
          <span className="list-icon">📋</span> Danh sách công việc
        </h2>
        <div className="filter-section">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select status">
            <option value="all">Tất cả trạng thái</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="uncompleted">Chưa hoàn thành</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="filter-select type">
            <option value="all">Tất cả công việc</option>
            <option value="created">Tôi tạo</option>
            <option value="shared">Được chia sẻ</option>
          </select>
        </div>
        {loading && (
          <div className="loading">
            <span className="loading-spinner"></span>
            <span className="loading-text">Đang tải dữ liệu...</span>
          </div>
        )}
        {!loading && (
          tasksFiltered.length === 0 ? (
            <p className="empty-message">Không có công việc nào phù hợp.</p>
          ) : (
            <ul className="task-items">
              {tasksFiltered.map((task, idx) => (
                <li key={task.id} className="task-item">
                  <div className="task-title">
                    {idx + 1}. {task.title}
                  </div>
                  <div className="task-content">{task.content}</div>
                  <div className="task-creator">Người tạo: {task.creator.slice(0, 6)}...{task.creator.slice(-4)}</div>
                  {task.assignedTo && task.assignedTo.length > 0 && (
                    <div className="task-assigned">
                      <span className="label">Chia sẻ cho: </span>
                      {task.assignedTo.map(addr => (
                        <span key={addr} className="address">
                          {addr.slice(0, 6)}...{addr.slice(-4)}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="task-timestamp">Thời gian: {task.timestamp}</div>
                  {task.fileUrl && task.fileUrl.length > 0 && (
                    <div className="task-file">
                      <a
                        href={task.fileUrl}
                        className="file-link"
                        download
                        onClick={e => {
                          e.preventDefault();
                          const link = document.createElement('a');
                          link.href = task.fileUrl;
                          link.download = task.fileUrl.split('/').pop();
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        📎 Tải tệp đính kèm
                      </a>
                    </div>
                  )}
                  <div className="task-status">
                    <span className="status-label">Trạng thái:</span>
                    {task.completed ? (
                      <span className="status-completed">Đã hoàn thành</span>
                    ) : (
                      <span className="status-pending">Chưa hoàn thành</span>
                    )}
                  </div>
                  {task.completed && (task.creator.toLowerCase() === account.toLowerCase() || (task.assignedTo && task.assignedTo.map(a => a.toLowerCase()).includes(account.toLowerCase()))) && (
                    <div className="task-actions">
                      <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✔ Đã xác nhận hoàn thành</span>
                    </div>
                  )}
                  <div className="task-actions">
                    <button
                      onClick={() => {
                        setTaskTitle(task.title);
                        setTaskContent(task.content);
                        setAssignedTo(task.assignedTo.join(','));
                        setEditingTaskId(task.id);
                      }}
                      className="action-button edit"
                    >
                      Sửa
                    </button>
                    {!task.completed && (
                      <button
                        onClick={() => completeTask(task.id)}
                        className="action-button complete"
                      >
                        Hoàn thành
                      </button>
                    )}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="action-button delete"
                    >
                      Xóa
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}

export default App;