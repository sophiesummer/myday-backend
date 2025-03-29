// Example React component for Firebase Authentication with backend integration
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com", 
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Base API URL
const API_URL = 'http://localhost:3000/api';

// Auth Context Component
const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync user with backend after Firebase authentication
  const syncUserWithBackend = async (user) => {
    try {
      if (!user) return null;
      
      const idToken = await user.getIdToken();
      
      const response = await fetch(`${API_URL}/users/sync`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to sync user with backend');
      }
      
      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error syncing with backend:', error);
      return null;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const backendUser = await syncUserWithBackend(firebaseUser);
        setCurrentUser({
          firebaseUser,
          backendUser
        });
      } else {
        // User is signed out
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign up with email/password
  const signup = async (email, password, name) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Update display name
      await result.user.updateProfile({ displayName: name });
      return result.user;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  // Login with email/password
  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  };

  // Login with Google
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Error logging in with Google:', error);
      throw error;
    }
  };

  // Logout
  const logout = () => {
    return signOut(auth);
  };

  // Custom API request function with auth token
  const apiRequest = async (endpoint, method = 'GET', body = null) => {
    try {
      if (!currentUser?.firebaseUser) {
        throw new Error('User not authenticated');
      }
      
      const idToken = await currentUser.firebaseUser.getIdToken();
      
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(`${API_URL}${endpoint}`, options);
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    return apiRequest('/users/profile', 'PUT', userData);
  };

  // Get user tasks
  const getUserTasks = async () => {
    return apiRequest('/tasks');
  };

  // Create a new task
  const createTask = async (taskData) => {
    return apiRequest('/tasks', 'POST', taskData);
  };

  const value = {
    currentUser,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    updateProfile,
    getUserTasks,
    createTask,
    apiRequest
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Create Auth Context
const AuthContext = React.createContext();

// Hook to use the auth context
export const useAuth = () => {
  return React.useContext(AuthContext);
};

export { AuthProvider, AuthContext };

// Example Login Component
export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, loginWithGoogle } = useAuth();
  
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      // Redirect happens automatically with onAuthStateChanged
    } catch (error) {
      setError('Failed to log in: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      // Redirect happens automatically with onAuthStateChanged
    } catch (error) {
      setError('Failed to log in with Google: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="login-page">
      <h1>Login</h1>
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleEmailLogin}>
        <div>
          <label>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" disabled={loading}>
          Log In
        </button>
      </form>
      
      <div className="divider">OR</div>
      
      <button onClick={handleGoogleLogin} disabled={loading}>
        Sign in with Google
      </button>
    </div>
  );
};

// Example Task List Component
export const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { getUserTasks } = useAuth();
  
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const result = await getUserTasks();
        setTasks(result.tasks);
      } catch (error) {
        setError('Failed to fetch tasks: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
  }, [getUserTasks]);
  
  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div className="error">{error}</div>;
  
  return (
    <div className="task-list">
      <h2>Your Tasks</h2>
      {tasks.length === 0 ? (
        <p>No tasks found. Create your first task!</p>
      ) : (
        <ul>
          {tasks.map(task => (
            <li key={task._id}>
              <h3>{task.title}</h3>
              <p>{task.description}</p>
              <span>Status: {task.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}; 