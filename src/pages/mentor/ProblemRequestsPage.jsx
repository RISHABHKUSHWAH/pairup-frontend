import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import LearnerProfileModal from '../../components/LearnerProfileModal';
import { api, initials, mentorSavedProblems, mentorProfileSettings } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context';
import {
  DocumentIcon,
  SearchIcon,
  EyeIcon,
  MessageIcon,
  HeartIcon,
  CheckIcon,
  ClockIcon,
  FilterIcon,
  SlidersIcon,
  ChevronDownIcon,
  XIcon,
} from '../../components/Icons';

function formatPostDateTime(dateVal) {
  if (!dateVal) return 'Recent';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

export default function ProblemRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [problems, setProblems] = useState([]);
  const [myProposals, setMyProposals] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'new' | 'matching' | 'recommended' | 'saved'

  // Advanced Filter & Sort states
  const [budgetFilter, setBudgetFilter] = useState('all'); // 'all' | 'under_500' | '500_1500' | 'above_1500'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'highest_budget' | 'lowest_budget'
  const [selectedTech, setSelectedTech] = useState('all'); // 'all' | string
  const [proposalStatusFilter, setProposalStatusFilter] = useState('all'); // 'all' | 'unapplied' | 'applied'
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterRef = React.useRef(null);

  // Modals
  const [detailProblem, setDetailProblem] = useState(null);
  const [proposalProblem, setProposalProblem] = useState(null);
  const [selectedLearner, setSelectedLearner] = useState(null);

  // Proposal form
  const [coverLetter, setCoverLetter] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mentor profile for matching skills
  const [mentorSkills, setMentorSkills] = useState([]);

  useEffect(() => {
    const prof = mentorProfileSettings.getProfile(user);
    setMentorSkills(prof.skills || []);
    setSavedIds(mentorSavedProblems.getSaved());
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [probData, propData] = await Promise.all([
        api.getProblems().catch((err) => {
          console.error('api.getProblems failed:', err);
          return [];
        }),
        api.getMyProposals().catch(() => []),
      ]);
      const list = Array.isArray(probData) ? probData : (probData?.problems || []);
      setProblems(list);
      setMyProposals(Array.isArray(propData) ? propData : []);
    } catch (err) {
      console.error('Failed to load problems:', err);
    } finally {
      setLoading(false);
    }
  };

  const myProposalProblemIds = new Set(myProposals.map((p) => p.problem_id || p.problem));

  const handleToggleSave = (e, id) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const updated = mentorSavedProblems.toggleSave(id);
    setSavedIds([...updated]);
    const isNowSaved = updated.some((sId) => String(sId) === String(id));
    toast?.success?.(isNowSaved ? 'Saved to Favorites' : 'Removed from Favorites');
  };

  const allSkills = React.useMemo(() => {
    const set = new Set();
    problems.forEach((p) => {
      if (Array.isArray(p.skills)) {
        p.skills.forEach((s) => s && set.add(s.trim()));
      } else if (typeof p.skills === 'string') {
        p.skills.split(',').forEach((s) => s.trim() && set.add(s.trim()));
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [problems]);

  const activeFilterCount =
    (budgetFilter !== 'all' ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0) +
    (selectedTech !== 'all' ? 1 : 0) +
    (proposalStatusFilter !== 'all' ? 1 : 0) +
    (favoritesOnly ? 1 : 0);

  const clearAllFilters = () => {
    setBudgetFilter('all');
    setSortBy('newest');
    setSelectedTech('all');
    setProposalStatusFilter('all');
    setFavoritesOnly(false);
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterMenuOpen(false);
      }
    }
    if (filterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [filterMenuOpen]);

  // Filter & sort logic
  const filteredProblems = problems
    .filter((p) => {
      // Search match
      const term = search.toLowerCase();
      const matchSearch =
        !term ||
        p.title?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term) ||
        p.learner_name?.toLowerCase().includes(term) ||
        p.skills?.some((s) => s.toLowerCase().includes(term));

      if (!matchSearch) return false;

      if (filterTab === 'saved' || favoritesOnly) {
        const isFav = savedIds.some((sId) => String(sId) === String(p.id));
        if (!isFav) return false;
      }

      if (filterTab === 'new') {
        // Created within last 3 days
        const created = new Date(p.created_at || Date.now());
        const diffDays = (Date.now() - created.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 3) return false;
      }

      if (filterTab === 'matching') {
        if (mentorSkills.length > 0) {
          const lowerMentorSkills = mentorSkills.map((s) => s.toLowerCase());
          if (!p.skills?.some((s) => lowerMentorSkills.includes(s.toLowerCase()))) return false;
        }
      }

      if (filterTab === 'recommended') {
        const lowerMentorSkills = mentorSkills.map((s) => s.toLowerCase());
        const hasSkill = p.skills?.some((s) => lowerMentorSkills.includes(s.toLowerCase()));
        const goodBudget = (p.budget || p.budget_max || 0) >= 800;
        if (!hasSkill && !goodBudget) return false;
      }

      // Budget filter
      if (budgetFilter !== 'all') {
        const b = p.budget || p.budget_max || 0;
        if (budgetFilter === 'under_500' && b >= 500) return false;
        if (budgetFilter === '500_1500' && (b < 500 || b > 1500)) return false;
        if (budgetFilter === 'above_1500' && b <= 1500) return false;
      }

      // Technology / Skill filter
      if (selectedTech !== 'all') {
        const techMatch = p.skills?.some((s) => s.toLowerCase() === selectedTech.toLowerCase());
        if (!techMatch) return false;
      }

      // Proposal status filter
      if (proposalStatusFilter !== 'all') {
        const hasProposal = myProposalProblemIds.has(p.id);
        if (proposalStatusFilter === 'applied' && !hasProposal) return false;
        if (proposalStatusFilter === 'unapplied' && hasProposal) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (sortBy === 'highest_budget') {
        const bA = a.budget || a.budget_max || 0;
        const bB = b.budget || b.budget_max || 0;
        return bB - bA;
      }
      if (sortBy === 'lowest_budget') {
        const bA = a.budget || a.budget_min || 0;
        const bB = b.budget || b.budget_min || 0;
        return bA - bB;
      }
      return 0;
    });

  const openProposalModal = (prob) => {
    setProposalProblem(prob);
    setCoverLetter('');
    const defaultPrice = prob.budget || prob.budget_max || 800;
    setPrice(defaultPrice);
    setDuration('60');
    setError('');
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.submitProposal(proposalProblem.id, {
        cover_letter: coverLetter.trim(),
        price: Number(price),
        estimated_duration_minutes: Number(duration),
      });
      toast.success('Proposal sent successfully! The learner will be notified.');
      setProposalProblem(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit proposal');
      setError(err.message || 'Failed to submit proposal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout
      title="Explore Problems"
      portalType="mentor"
      actions={
        <Link to="/mentor/my-proposals" className="btn btn-ghost" style={{ fontSize: '13px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <DocumentIcon size={14} /> My Proposals ({myProposals.length})
          </span>
        </Link>
      }
    >
      <p className="sub" style={{ marginBottom: '16px' }}>
        Explore all technical bottlenecks, bug reports, and challenges posted by learners. Review context, filter by your expertise, and submit proposals with your pricing and schedule.
      </p>

      {/* Filter Tabs */}
      <div className="filter-bar" style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button
          type="button"
          className={`filter-chip ${filterTab === 'all' ? 'active' : ''}`}
          onClick={() => setFilterTab('all')}
        >
          All Problems ({problems.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${filterTab === 'new' ? 'active' : ''}`}
          onClick={() => setFilterTab('new')}
        >
          New Problems
        </button>
        <button
          type="button"
          className={`filter-chip ${filterTab === 'matching' ? 'active' : ''}`}
          onClick={() => setFilterTab('matching')}
        >
          Matching Skills
        </button>
        <button
          type="button"
          className={`filter-chip ${filterTab === 'recommended' ? 'active' : ''}`}
          onClick={() => setFilterTab('recommended')}
        >
          Recommended
        </button>
        <button
          type="button"
          className={`filter-chip ${filterTab === 'saved' ? 'active' : ''}`}
          onClick={() => setFilterTab('saved')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <HeartIcon size={13} fill={filterTab === 'saved' ? '#EF4444' : 'none'} stroke={filterTab === 'saved' ? '#EF4444' : 'currentColor'} />
            Favorites ({savedIds.length})
          </span>
        </button>
      </div>

      {/* Search Input & Filter Option */}
      <div className="filters" style={{ marginBottom: activeFilterCount > 0 ? '12px' : '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          className="search"
          placeholder="Search problems by title, description, category, skills, or learner name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Filter Option Button & Dropdown Menu */}
        <div style={{ position: 'relative' }} ref={filterRef}>
          <button
            type="button"
            className={`btn ${activeFilterCount > 0 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            style={{
              height: '42px',
              padding: '0 16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: filterMenuOpen ? '0 0 0 3px var(--accent-soft)' : 'none',
              transition: 'all 0.15s ease',
            }}
            title="Filter and sort problem requests"
          >
            <FilterIcon size={15} />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 7px',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginLeft: '2px',
                }}
              >
                {activeFilterCount}
              </span>
            )}
            <ChevronDownIcon
              size={14}
              style={{
                transform: filterMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            />
          </button>

          {/* Filter Dropdown Popover */}
          {filterMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                zIndex: 100,
                width: '320px',
                background: 'var(--surface)',
                border: '1px solid var(--grid-strong)',
                borderRadius: '12px',
                padding: '18px',
                boxShadow: '0 14px 34px rgba(0, 0, 0, 0.28)',
              }}
            >
              {/* Dropdown Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px' }}>
                  <SlidersIcon size={15} />
                  <span>Filter Options</span>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600,
                    }}
                  >
                    Reset All
                  </button>
                )}
              </div>

              {/* Sort By */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Sort Order
                </label>
                <select
                  className="input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '8px 12px' }}
                >
                  <option value="newest">🕒 Newest First (Default)</option>
                  <option value="oldest">⌛ Oldest First</option>
                  <option value="highest_budget">💰 Highest Budget</option>
                  <option value="lowest_budget">🏷️ Lowest Budget</option>
                </select>
              </div>

              {/* Favorites Option */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Favorites / Bookmarks
                </label>
                <select
                  className="input"
                  value={favoritesOnly ? 'favorites' : 'all'}
                  onChange={(e) => setFavoritesOnly(e.target.value === 'favorites')}
                  style={{ width: '100%', fontSize: '13px', padding: '8px 12px' }}
                >
                  <option value="all">All Posts</option>
                  <option value="favorites">❤️ Favorites Only ({savedIds.length})</option>
                </select>
              </div>

              {/* Budget Filter */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Budget Range
                </label>
                <select
                  className="input"
                  value={budgetFilter}
                  onChange={(e) => setBudgetFilter(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '8px 12px' }}
                >
                  <option value="all">All Budgets</option>
                  <option value="under_500">Under ₹500</option>
                  <option value="500_1500">₹500 – ₹1,500</option>
                  <option value="above_1500">Above ₹1,500</option>
                </select>
              </div>

              {/* Technology / Skill Filter */}
              {allSkills.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '6px' }}>
                    Skill / Technology
                  </label>
                  <select
                    className="input"
                    value={selectedTech}
                    onChange={(e) => setSelectedTech(e.target.value)}
                    style={{ width: '100%', fontSize: '13px', padding: '8px 12px' }}
                  >
                    <option value="all">All Technologies ({allSkills.length})</option>
                    {allSkills.map((sk) => (
                      <option key={sk} value={sk}>
                        {sk}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Proposal Status */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Proposal Status
                </label>
                <select
                  className="input"
                  value={proposalStatusFilter}
                  onChange={(e) => setProposalStatusFilter(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '8px 12px' }}
                >
                  <option value="all">All Problem Requests</option>
                  <option value="unapplied">Not Applied Yet</option>
                  <option value="applied">Proposal Sent ({myProposals.length})</option>
                </select>
              </div>

              {/* Done / Apply Button */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setFilterMenuOpen(false)}
                style={{ fontSize: '12.5px', padding: '8px 16px', width: '100%', justifyContent: 'center' }}
              >
                Apply Filters ({filteredProblems.length} results)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '18px' }}>
          <span style={{ fontSize: '12px', color: 'var(--ink-muted)', fontWeight: 600 }}>Active filters:</span>
          {sortBy !== 'newest' && (
            <span className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--surface)', border: '1px solid var(--grid-strong)' }}>
              Sort: {sortBy === 'oldest' ? 'Oldest First' : sortBy === 'highest_budget' ? 'Highest Budget' : 'Lowest Budget'}
              <button
                type="button"
                onClick={() => setSortBy('newest')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', padding: 0, lineHeight: 1 }}
                title="Remove sort filter"
              >
                <XIcon size={12} />
              </button>
            </span>
          )}
          {favoritesOnly && filterTab !== 'saved' && (
            <span className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--surface)', border: '1px solid var(--grid-strong)' }}>
              ❤️ Favorites Only
              <button
                type="button"
                onClick={() => setFavoritesOnly(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', padding: 0, lineHeight: 1 }}
                title="Remove favorites filter"
              >
                <XIcon size={12} />
              </button>
            </span>
          )}
          {budgetFilter !== 'all' && (
            <span className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--surface)', border: '1px solid var(--grid-strong)' }}>
              Budget: {budgetFilter === 'under_500' ? 'Under ₹500' : budgetFilter === '500_1500' ? '₹500 – ₹1,500' : 'Above ₹1,500'}
              <button
                type="button"
                onClick={() => setBudgetFilter('all')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', padding: 0, lineHeight: 1 }}
                title="Remove budget filter"
              >
                <XIcon size={12} />
              </button>
            </span>
          )}
          {selectedTech !== 'all' && (
            <span className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--surface)', border: '1px solid var(--grid-strong)' }}>
              Skill: {selectedTech}
              <button
                type="button"
                onClick={() => setSelectedTech('all')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', padding: 0, lineHeight: 1 }}
                title="Remove skill filter"
              >
                <XIcon size={12} />
              </button>
            </span>
          )}
          {proposalStatusFilter !== 'all' && (
            <span className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--surface)', border: '1px solid var(--grid-strong)' }}>
              Status: {proposalStatusFilter === 'applied' ? 'Proposal Sent' : 'Not Applied'}
              <button
                type="button"
                onClick={() => setProposalStatusFilter('all')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', padding: 0, lineHeight: 1 }}
                title="Remove status filter"
              >
                <XIcon size={12} />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={clearAllFilters}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', padding: '0 4px' }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Problem Cards List */}
      {loading ? (
        <p className="sub">Loading available problem requests...</p>
      ) : filteredProblems.length === 0 ? (
        <div className="empty" style={{ padding: '36px', textAlign: 'center', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '8px', color: 'var(--muted)' }}>
            <SearchIcon size={32} />
          </div>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>No problem requests found</div>
          <p className="sub" style={{ fontSize: '13px', margin: '4px 0 12px' }}>
            {filterTab === 'saved' || favoritesOnly
              ? "You haven't added any favorite posts yet. Click the heart icon on any post to add it to your favorites."
              : 'Try selecting a different filter tab or clearing your search keywords.'}
          </p>
          {filterTab !== 'all' && (
            <button type="button" className="btn btn-secondary" onClick={() => setFilterTab('all')}>
              View All Requests
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredProblems.map((p) => {
            const isSaved = savedIds.some((sId) => String(sId) === String(p.id));
            const hasProposal = myProposalProblemIds.has(p.id);

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: '18px 20px',
                  borderRadius: '10px',
                  border: isSaved ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid var(--border)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  position: 'relative',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--ink)' }}>{p.title}</span>
                      {p.category && (
                        <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                          {p.category}
                        </span>
                      )}
                    </div>
                    <p className="sub" style={{ margin: '8px 0 12px', fontSize: '13.5px', lineHeight: 1.5 }}>
                      {p.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{
                        padding: '6px 8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        color: isSaved ? '#EF4444' : 'var(--muted)',
                        transition: 'transform 0.15s ease, color 0.15s ease',
                      }}
                      title={isSaved ? 'Remove from favorites' : 'Add to favorites'}
                      onClick={(e) => handleToggleSave(e, p.id)}
                    >
                      <HeartIcon size={18} fill={isSaved ? '#EF4444' : 'none'} stroke={isSaved ? '#EF4444' : 'currentColor'} />
                    </button>
                    {(p.budget || p.budget_max) && (
                      <div className="mono" style={{ fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--brand)', fontSize: '15px' }}>
                        ₹{p.budget || `${p.budget_min || 500} - ${p.budget_max || 1500}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Skills Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  {p.skills?.map((s) => (
                    <span key={s} className="tag" style={{ fontSize: '12px' }}>
                      {s}
                    </span>
                  ))}
                </div>

                {/* Footer Info & Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px dashed var(--border)',
                    paddingTop: '12px',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div className="sub" style={{ margin: 0, fontSize: '12px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span
                      className="user-profile-trigger"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }}
                      onClick={() => setSelectedLearner({ id: p.learner_id, name: p.learner_name })}
                      title="Click to view learner profile"
                    >
                      <div className="avatar-sm" style={{ width: '22px', height: '22px', fontSize: '10px' }}>
                        {initials(p.learner_name || 'Learner')}
                      </div>
                      <strong className="user-profile-name" style={{ color: 'var(--ink)' }}>{p.learner_name || 'Learner'}</strong>
                    </span>
                    <span
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title={p.created_at ? new Date(p.created_at).toLocaleString() : undefined}
                    >
                      <ClockIcon size={12} style={{ opacity: 0.7, flexShrink: 0 }} />
                      <span>{formatPostDateTime(p.created_at)}</span>
                    </span>
                    {p.preferred_time && <span>Prefers: {p.preferred_time}</span>}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '12.5px', padding: '5px 12px' }}
                      onClick={() => setDetailProblem(p)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <EyeIcon size={13} /> Full Details
                      </span>
                    </button>

                    <Link
                      to={`/chat?with=${p.learner_id}&name=${encodeURIComponent(p.learner_name || 'Learner')}`}
                      className="btn btn-ghost"
                      style={{ fontSize: '12.5px', padding: '5px 12px' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <MessageIcon size={13} /> Message
                      </span>
                    </Link>

                    {hasProposal ? (
                      <span className="status-badge badge-accepted mono" style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckIcon size={13} /> Proposal Sent
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: '12.5px', padding: '5px 14px' }}
                        onClick={() => openProposalModal(p)}
                      >
                        Submit Proposal
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Problem Request Detail Modal */}
      <Modal
        isOpen={Boolean(detailProblem)}
        onClose={() => setDetailProblem(null)}
        title="Problem Request Details"
      >
        {detailProblem && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>{detailProblem.title}</h3>
                <div className="sub" style={{ fontSize: '12px', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Posted by {detailProblem.learner_name || 'Learner'}</span>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <ClockIcon size={12} style={{ opacity: 0.7, flexShrink: 0 }} />
                    {formatPostDateTime(detailProblem.created_at)}
                  </span>
                </div>
              </div>
              <span className="badge badge-primary" style={{ fontSize: '14px', fontWeight: 600 }}>
                Budget: ₹{detailProblem.budget || `${detailProblem.budget_min || 500} - ${detailProblem.budget_max || 1500}`}
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Description & Context:</div>
              <p style={{ fontSize: '13.5px', lineHeight: 1.6, background: 'var(--panel-bg)', padding: '12px', borderRadius: '6px', margin: 0 }}>
                {detailProblem.description}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '10px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Technology Category</div>
                <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                  {detailProblem.category || 'Software Engineering'}
                </div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                <div className="sub" style={{ fontSize: '11px' }}>Estimated / Preferred Duration</div>
                <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                  {detailProblem.duration ? `${detailProblem.duration} Minutes` : '45 - 60 Minutes'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>Skills & Stack Required:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {detailProblem.skills?.map((s) => (
                  <span key={s} className="tag" style={{ fontSize: '12px' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Error logs / Attachments section */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                Error Logs &amp; Snippet Attachments:
              </div>
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--card-bg, #0f0f17)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: 'var(--code-ink, #a5b4fc)',
                  overflowX: 'auto',
                }}
              >
                {detailProblem.attachments ||
                  detailProblem.error_log ||
                  `// Stack trace provided with problem request:
Traceback (most recent call last):
  File "server.py", line 42, in handle_request
    connection = pool.get_connection(timeout=3.0)
TimeoutError: Resource pool exhausted under concurrent load.`}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleToggleSave({ stopPropagation: () => {} }, detailProblem.id)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <HeartIcon
                    size={15}
                    fill={savedIds.some((sId) => String(sId) === String(detailProblem.id)) ? '#EF4444' : 'none'}
                    stroke={savedIds.some((sId) => String(sId) === String(detailProblem.id)) ? '#EF4444' : 'currentColor'}
                  />
                  {savedIds.some((sId) => String(sId) === String(detailProblem.id)) ? 'Favorited' : 'Add to Favorites'}
                </span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const prob = detailProblem;
                  setDetailProblem(null);
                  openProposalModal(prob);
                }}
              >
                Submit Proposal
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Submit Proposal Modal */}
      <Modal
        isOpen={Boolean(proposalProblem)}
        onClose={() => setProposalProblem(null)}
        title="Submit a Proposal"
      >
        {proposalProblem && (
          <form onSubmit={handleSubmitProposal}>
            <div style={{ marginBottom: '14px', fontSize: '13.5px', fontWeight: 600 }}>
              Applying for: "{proposalProblem.title}"
            </div>

            {error && <div className="error-box" style={{ marginBottom: '12px' }}>{error}</div>}

            <div className="field">
              <label>Cover Letter / Proposed Approach</label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Detail your diagnosis steps, prior experience fixing similar issues, and how you will structure the pairing session..."
                required
                rows={4}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="field">
                <label>Proposed Price (₹)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="100"
                  required
                />
                <div className="sub" style={{ fontSize: '11px', marginTop: '2px' }}>
                  Learner budget: ₹{proposalProblem.budget || `${proposalProblem.budget_min || 500} - ${proposalProblem.budget_max || 1500}`}
                </div>
              </div>

              <div className="field">
                <label>Estimated Duration</label>
                <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                  <option value="30">30 Minutes (Quick fix)</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes (Standard 1 hr)</option>
                  <option value="90">90 Minutes (Deep dive)</option>
                  <option value="120">120 Minutes (2 hours)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setProposalProblem(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Send Proposal'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <LearnerProfileModal
        isOpen={Boolean(selectedLearner)}
        onClose={() => setSelectedLearner(null)}
        learner={selectedLearner}
      />
    </PortalLayout>
  );
}
