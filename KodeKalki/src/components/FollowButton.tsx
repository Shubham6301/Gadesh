import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, UserCheck, UserMinus, Users } from 'lucide-react';
import { API_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface FollowButtonProps {
  targetUsername: string;
  showCounts?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onFollowChange?: (isFollowing: boolean, counts: { followers: number; following: number }) => void;
}

interface FollowStatus {
  isFollowing: boolean;
  followsYou: boolean;
  followersCount: number;
  followingCount: number;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  targetUsername,
  showCounts = false,
  size = 'md',
  className = '',
  onFollowChange,
}) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<FollowStatus>({
    isFollowing: false,
    followsYou: false,
    followersCount: 0,
    followingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (user && targetUsername && user.username !== targetUsername) {
      fetchStatus();
    } else {
      setLoading(false);
    }
  }, [targetUsername, user]);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/follow/${targetUsername}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus(res.data);
    } catch (err) {
      console.error('Follow status fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user || actionLoading) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (status.isFollowing) {
        const res = await axios.delete(`${API_URL}/follow/${targetUsername}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const newStatus = {
          ...status,
          isFollowing: false,
          followersCount: res.data.followersCount,
          followingCount: res.data.followingCount,
        };
        setStatus(newStatus);
        onFollowChange?.(false, { followers: res.data.followersCount, following: res.data.followingCount });
      } else {
        const res = await axios.post(
          `${API_URL}/follow/${targetUsername}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const newStatus = {
          ...status,
          isFollowing: true,
          followersCount: res.data.followersCount,
          followingCount: res.data.followingCount,
        };
        setStatus(newStatus);
        onFollowChange?.(true, { followers: res.data.followersCount, following: res.data.followingCount });
      }
    } catch (err: any) {
      console.error('Follow action error:', err);
    } finally {
      setActionLoading(false);
      setIsHovered(false);
    }
  };

  // Don't show button on own profile or if not logged in
  if (!user || user.username === targetUsername) return null;

  const sizeClasses = {
    sm: 'px-3 py-1 text-xs gap-1',
    md: 'px-4 py-1.5 text-sm gap-1.5',
    lg: 'px-5 py-2 text-sm gap-2',
  };

  const iconSize = { sm: 12, md: 14, lg: 15 }[size];

  if (loading) {
    return (
      <div
        className={`inline-flex items-center justify-center ${sizeClasses[size]} rounded font-semibold
          bg-gray-100 dark:bg-gray-700 text-gray-100 dark:text-gray-700 animate-pulse select-none ${className}`}
        style={{ minWidth: 90 }}
      >
        Follow
      </div>
    );
  }

  const isFollowing = status.isFollowing;
  const followsYou = status.followsYou;

  // Button appearance based on state
  let label = followsYou ? 'Follow Back' : 'Follow';
  let btnClass = 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white border border-transparent';
  let Icon = UserPlus;

  if (isFollowing) {
    label = isHovered ? 'Unfollow' : 'Following';
    Icon = isHovered ? UserMinus : UserCheck;
    btnClass = isHovered
      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600'
      : 'bg-gray-100 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600';
  }

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <button
        onClick={handleFollow}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={actionLoading}
        className={`
          inline-flex items-center justify-center font-semibold rounded
          transition-all duration-150 ease-in-out cursor-pointer
          ${sizeClasses[size]} ${btnClass}
          ${actionLoading ? 'opacity-60 cursor-not-allowed' : ''}
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500 dark:focus:ring-offset-gray-900
        `}
        style={{ minWidth: 100 }}
      >
        {actionLoading ? (
          <svg className="animate-spin" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
        ) : (
          <Icon size={iconSize} strokeWidth={2.2} />
        )}
        <span>{label}</span>
      </button>

      {/* Badges */}
      {isFollowing && followsYou && (
        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Users size={10} />
          Mutual
        </span>
      )}
      {!isFollowing && followsYou && (
        <span className="text-xs text-blue-500 dark:text-blue-400 font-medium">
          Follows you
        </span>
      )}

      {/* Optional follower/following counts */}
      {showCounts && (
        <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          <span>
            <strong className="text-gray-800 dark:text-gray-200">{status.followersCount}</strong> Followers
          </span>
          <span>
            <strong className="text-gray-800 dark:text-gray-200">{status.followingCount}</strong> Following
          </span>
        </div>
      )}
    </div>
  );
};

export default FollowButton;
