import { defineStore } from 'pinia';
import apiClient from '@shared/utils/api';
import { useUserStore } from './user';
import { useDateStore } from './date';
import { useRealmStore } from './realm';

export const useReportsStore = defineStore('reports', {
    state: () => ({
        // Current active report
        active: null,
        
        // All reports indexed by ID
        reports: {},
        
        // Reports filtered by year (for Year-ID-index GSI)
        reportsByYear: {},
        
        // Report summaries (for ID-index GSI)
        reportSummaries: [],
        
        // Oldest report year in the database
        oldestReportYear: null,
        
        // Latest report in the database
        latestReport: null,
        
        // Loading states
        loaded: false,
        loading: false,
        
        // Pagination tokens
        lastEvaluatedKeys: {
            all: null,
            byYear: {},
            summaries: null,
            byAuthor: {}
        }
    }),
    
    getters: {
        // Get all reports as an array, sorted by most recent first
        reportList(state) {
            const reports = Object.values(state.reports);
            return reports.sort((a, b) => {
                // Sort by year first, then by start date, then by timestamp
                if (a.Year !== b.Year) {
                    return b.Year - a.Year;
                }
                
                // Compare start dates
                const aDate = new Date(a.Dates?.Start?.Y || 0, (a.Dates?.Start?.M || 1) - 1, a.Dates?.Start?.D || 1);
                const bDate = new Date(b.Dates?.Start?.Y || 0, (b.Dates?.Start?.M || 1) - 1, b.Dates?.Start?.D || 1);
                const dateDiff = bDate - aDate;
                
                // If dates are the same, sort by timestamp (most recent first)
                if (dateDiff === 0) {
                    const aTS = a.TS || 0;
                    const bTS = b.TS || 0;
                    return bTS - aTS;
                }
                
                return dateDiff;
            });
        },
        
        // Get reports by a specific year, sorted chronologically (most recent first)
        getReportsByYear: (state) => (year) => {
            const reports = state.reportsByYear[year] || [];
            return reports.sort((a, b) => {
                // Compare start dates
                const aDate = new Date(a.Dates?.Start?.Y || 0, (a.Dates?.Start?.M || 1) - 1, a.Dates?.Start?.D || 1);
                const bDate = new Date(b.Dates?.Start?.Y || 0, (b.Dates?.Start?.M || 1) - 1, b.Dates?.Start?.D || 1);
                const dateDiff = bDate - aDate;
                
                // If dates are the same, sort by timestamp (most recent first)
                if (dateDiff === 0) {
                    const aTS = a.TS || 0;
                    const bTS = b.TS || 0;
                    return bTS - aTS;
                }
                
                return dateDiff;
            });
        },
        
        // Get reports by author, sorted chronologically (most recent first)
        getReportsByAuthor: (state) => (author) => {
            const reports = Object.values(state.reports).filter(report => 
                report.Author?.toLowerCase() === author?.toLowerCase()
            );
            return reports.sort((a, b) => {
                // Sort by year first, then by start date, then by timestamp
                if (a.Year !== b.Year) {
                    return b.Year - a.Year;
                }
                
                // Compare start dates
                const aDate = new Date(a.Dates?.Start?.Y || 0, (a.Dates?.Start?.M || 1) - 1, a.Dates?.Start?.D || 1);
                const bDate = new Date(b.Dates?.Start?.Y || 0, (b.Dates?.Start?.M || 1) - 1, b.Dates?.Start?.D || 1);
                const dateDiff = bDate - aDate;
                
                // If dates are the same, sort by timestamp (most recent first)
                if (dateDiff === 0) {
                    const aTS = a.TS || 0;
                    const bTS = b.TS || 0;
                    return bTS - aTS;
                }
                
                return dateDiff;
            });
        },
        
        // Get unique years from all reports
        availableYears(state) {
            const years = new Set();
            Object.values(state.reports).forEach(report => {
                if (report.Year) {
                    years.add(report.Year);
                }
            });
            return Array.from(years).sort((a, b) => b - a);
        },
        
        // Get unique authors from all reports
        availableAuthors(state) {
            const authors = new Set();
            Object.values(state.reports).forEach(report => {
                if (report.Author) {
                    authors.add(report.Author);
                }
            });
            return Array.from(authors).sort();
        },
        
        // Get active report
        activeReport(state) {
            return state.active;
        },
        
        // Get a report by ID
        getReportById: (state) => (id) => {
            return state.reports[id] || null;
        },
        
        // Check if reports are loaded
        isLoaded(state) {
            return state.loaded;
        },
        
        // Check if currently loading
        isLoading(state) {
            return state.loading;
        },
        
        // Get the oldest report year
        getOldestReportYear(state) {
            return state.oldestReportYear;
        },
        
        // Get the latest report
        getLatestReport(state) {
            return state.latestReport;
        }
    },
    
    actions: {
        // Initialize the store
        async init() {
            if (this.loaded || this.isLoading) return;

            try {
                // Skip report fetching if there's no active realm
                const realmStore = useRealmStore();
                if (!realmStore.activeRealm) {
                    this.loaded = true;
                    this.loading = false;
                    return;
                }

                // Get current year from date store to start browsing from
                const dateStore = useDateStore();
                const currentYear = dateStore.date.y;

                // Fetch the oldest report year first to establish browsing limits
                await this.fetchOldestReportYear();

                // Fetch the latest report
                await this.fetchLatestReport();

                // Load reports for the current year to start
                await this.fetchReportsByYear(currentYear);

                this.loaded = true;
                this.loading = false; // Mark as loaded
            } catch (error) {
                console.error('Error initializing reports store:', error);
                // Don't throw to prevent app crash, just log the error
                this.loaded = true; // Still mark as loaded to prevent infinite retries
                this.loading = false;
            }
        },
        
        // Fetch all reports with pagination support
        async fetchReports(limit = 50, lastEvaluatedKey = null) {
            try {
                this.loading = true;
                
                // Get current realm ID
                const realmStore = useRealmStore();
                const realmId = realmStore.activeRealm?.id;
                
                if (!realmId) {
                    console.warn('No active realm ID available for fetching reports');
                    return { items: [], hasMore: false, nextKey: null };
                }
                
                const params = { 
                    limit,
                    realmId: realmId
                };
                if (lastEvaluatedKey) {
                    params.lastEvaluatedKey = lastEvaluatedKey;
                }
                
                const response = await apiClient.get('/reports', { params });
                
                if (response.status >= 200 && response.status < 300) {
                    const { items, lastEvaluatedKey: nextKey, hasMore } = response.data;
                    
                    // Store reports indexed by ID
                    items.forEach(report => {
                        this.reports[report.ID] = report;
                    });
                    
                    // Store pagination info
                    this.lastEvaluatedKeys.all = nextKey;
                    
                    return { items, hasMore, nextKey };
                }
            } catch (error) {
                console.error('Error fetching reports:', error);
                throw error;
            } finally {
                this.loading = false;
            }
        },
        
        // Fetch reports by year (using RealmID-Year-index GSI)
        async fetchReportsByYear(year) {
            try {
                // Prevent duplicate fetches
                if (this.loading) {
                    return { items: this.reportsByYear[year] || [] };
                }
                
                // Check if we already have data for this year
                if (this.reportsByYear[year] && this.reportsByYear[year].length > 0) {
                    return { items: this.reportsByYear[year] };
                }
                
                this.loading = true;
                
                // Get current realm ID
                const realmStore = useRealmStore();
                const realmId = realmStore.activeRealm?.RealmID || realmStore.activeRealmID;
                
                if (!realmId) {
                    console.warn('No active realm ID available for fetching reports');
                    return { items: [] };
                }
                
                // Use the correct endpoint: /reports/year/{year}
                // No pagination needed for year-based queries
                // RealmID is determined on backend from authenticated user
                const response = await apiClient.get(`/reports/year/${year}`);
                
                if (response.status >= 200 && response.status < 300) {
                    const { items } = response.data;
                    
                    // Store in reportsByYear (replace any existing data)
                    this.reportsByYear[year] = items || [];
                    
                    // Also store in main reports object, but don't overwrite full reports with summaries
                    (items || []).forEach(report => {
                        const reportId = report.ID;
                        const existingReport = this.reports[reportId];
                        
                        // Only update if we don't have a full report already
                        if (!existingReport || !existingReport.Report) {
                            this.reports[reportId] = report;
                        }
                    });
                    
                    return { items: items || [] };
                }
            } catch (error) {
                console.error(`Error fetching reports for year ${year}:`, error);
                throw error;
            } finally {
                this.loading = false;
            }
        },
        
        // Fetch reports by author
        async fetchReportsByAuthor(author, limit = 50, lastEvaluatedKey = null) {
            try {
                this.loading = true;
                
                // Get current realm ID
                const realmStore = useRealmStore();
                const realmId = realmStore.activeRealm?.id;
                
                if (!realmId) {
                    console.warn('No active realm ID available for fetching reports');
                    return { items: [], hasMore: false, nextKey: null };
                }
                
                const params = { 
                    author, 
                    limit,
                    realmId: realmId
                };
                if (lastEvaluatedKey) {
                    params.lastEvaluatedKey = lastEvaluatedKey;
                }
                
                const response = await apiClient.get('/reports', { params });
                
                if (response.status >= 200 && response.status < 300) {
                    const { items, lastEvaluatedKey: nextKey, hasMore } = response.data;
                    
                    // Store individual reports
                    items.forEach(report => {
                        this.reports[report.ID] = report;
                    });
                    
                    // Store pagination info for this author
                    this.lastEvaluatedKeys.byAuthor[author] = nextKey;
                    
                    return { items, hasMore, nextKey };
                }
            } catch (error) {
                console.error(`Error fetching reports for author ${author}:`, error);
                throw error;
            } finally {
                this.loading = false;
            }
        },
        
        // Fetch report summaries (using ID-index GSI)
        async fetchReportSummaries(limit = 50, lastEvaluatedKey = null) {
            try {
                this.loading = true;
                
                // Get current realm ID
                const realmStore = useRealmStore();
                const realmId = realmStore.activeRealm?.id;
                
                if (!realmId) {
                    console.warn('No active realm ID available for fetching reports');
                    return { items: [], hasMore: false, nextKey: null };
                }
                
                const params = { 
                    summaries: 'true', 
                    limit,
                    realmId: realmId
                };
                if (lastEvaluatedKey) {
                    params.lastEvaluatedKey = lastEvaluatedKey;
                }
                
                const response = await apiClient.get('/reports', { params });
                
                if (response.status >= 200 && response.status < 300) {
                    const { items, lastEvaluatedKey: nextKey, hasMore } = response.data;
                    
                    // Append new summaries (for pagination)
                    if (!lastEvaluatedKey) {
                        this.reportSummaries = items;
                    } else {
                        this.reportSummaries.push(...items);
                    }
                    
                    // Store pagination info
                    this.lastEvaluatedKeys.summaries = nextKey;
                    
                    return { items, hasMore, nextKey };
                }
            } catch (error) {
                console.error('Error fetching report summaries:', error);
                throw error;
            } finally {
                this.loading = false;
            }
        },
        
        // Fetch the oldest report year from the database
        async fetchOldestReportYear() {
            try {
                // Use the oldest report endpoint - no realm ID needed, uses authenticated user's active realm
                const response = await apiClient.get('/reports/oldest');
                
                if (response.status === 200) {
                    const oldestYear = response.data?.year;
                    this.oldestReportYear = oldestYear;
                    
                    return oldestYear;
                } else if (response.status === 204) {
                    // No reports found - use current server year from date store
                    const dateStore = useDateStore();
                    const currentYear = dateStore.date.y;
                    this.oldestReportYear = currentYear;
                    
                    return currentYear;
                }
            } catch (error) {
                // If the API endpoint doesn't exist or fails, calculate from available reports
                console.warn('Failed to fetch oldest report year from API, calculating from available reports:', error);
                
                // Calculate from available reports
                const years = this.availableYears;
                if (years.length > 0) {
                    const oldestYear = Math.min(...years);
                    this.oldestReportYear = oldestYear;
                    return oldestYear;
                }
                
                // Fallback to current server year if no reports available
                const dateStore = useDateStore();
                const currentYear = dateStore.date.y;
                this.oldestReportYear = currentYear;
                return currentYear;
            }
        },

        // Fetch the latest report from the database
        async fetchLatestReport() {
            try {
                // Use the latest report endpoint - no realm ID needed, uses authenticated user's active realm
                const response = await apiClient.get('/reports/latest');
                
                if (response.status === 200) {
                    const latestReport = response.data;
                    this.latestReport = latestReport;
                    
                    // Also store in main reports object if not already there
                    const reportId = latestReport.ID;
                    if (reportId && !this.reports[reportId]) {
                        this.reports[reportId] = latestReport;
                    }
                    
                    return latestReport;
                } else if (response.status === 204) {
                    // No reports found in the realm
                    this.latestReport = null;
                    return null;
                }
            } catch (error) {
                console.warn('Failed to fetch latest report from API:', error);
                
                // Fallback: find latest from available reports
                const allReports = Object.values(this.reports);
                if (allReports.length > 0) {
                    // Sort by year descending, then by end date descending, then by timestamp
                    const sortedReports = allReports.sort((a, b) => {
                        // First sort by year (descending)
                        if (a.Year !== b.Year) {
                            return b.Year - a.Year;
                        }
                        
                        // Then sort by end date (descending)
                        const aEndDate = new Date(a.Dates?.End?.Y || 0, (a.Dates?.End?.M || 1) - 1, a.Dates?.End?.D || 1);
                        const bEndDate = new Date(b.Dates?.End?.Y || 0, (b.Dates?.End?.M || 1) - 1, b.Dates?.End?.D || 1);
                        const dateDiff = bEndDate.getTime() - aEndDate.getTime();
                        
                        // If dates are the same, sort by timestamp (most recent first)
                        if (dateDiff === 0) {
                            const aTS = a.TS || 0;
                            const bTS = b.TS || 0;
                            return bTS - aTS;
                        }
                        
                        return dateDiff;
                    });
                    
                    this.latestReport = sortedReports[0];
                    return this.latestReport;
                }
                
                this.latestReport = null;
                return null;
            }
        },
        
        // Get a single report by ID
        async fetchReportById(id) {
            try {
                this.loading = true;
                
                const response = await apiClient.get(`/reports/report/${id}`);
                
                if (response.status >= 200 && response.status < 300) {
                    const report = response.data;
                    this.reports[report.ID] = report;
                    
                    return report;
                }
            } catch (error) {
                if (error.response?.status === 404) {
                    console.warn(`Report ${id} not found`);
                    return null;
                }
                console.error(`Error fetching report ${id}:`, error);
                throw error;
            } finally {
                this.loading = false;
            }
        },
        
        // Create a new report
        async createReport(reportData) {
            try {
                this.loading = true;
                
                const response = await apiClient.post('/reports/report', reportData);
                
                if (response.status >= 200 && response.status < 300) {
                    const newReport = response.data;
                    const reportId = newReport.ID;
                    const reportYear = newReport.Year || newReport.Dates?.Start?.Y;
                    
                    // Add to main reports cache
                    this.reports[reportId] = newReport;
                    
                    // Add to year-specific cache - initialize if needed
                    if (reportYear) {
                        if (!this.reportsByYear[reportYear]) {
                            this.reportsByYear[reportYear] = [];
                        }
                        // Add to beginning of array to show most recent first
                        this.reportsByYear[reportYear].unshift(newReport);
                    }
                    
                    // Update latest report if this is more recent
                    if (!this.latestReport || reportYear > this.latestReport.Year) {
                        this.latestReport = newReport;
                    }
                    
                    return newReport;
                }
            } catch (error) {
                console.error('Error creating report:', error);
                throw error;
            } finally {
                this.loading = false;
            }
        },
        
        // Update an existing report
        async updateReport(id, updateData) {
            try {
                this.loading = true;
                
                const oldReport = this.reports[id];
                const response = await apiClient.put(`/reports/report/${id}`, updateData);
                
                if (response.status >= 200 && response.status < 300) {
                    const updatedReport = response.data;
                    const reportYear = updatedReport.Year || updatedReport.Dates?.Start?.Y;
                    const oldYear = oldReport?.Year || oldReport?.Dates?.Start?.Y;
                    
                    // Update main reports cache
                    this.reports[id] = updatedReport;
                    
                    // Update year cache - handle year changes
                    if (oldYear && oldYear !== reportYear && this.reportsByYear[oldYear]) {
                        // Remove from old year
                        const oldIndex = this.reportsByYear[oldYear].findIndex(r => r.ID === id);
                        if (oldIndex !== -1) {
                            this.reportsByYear[oldYear].splice(oldIndex, 1);
                        }
                    }
                    
                    if (reportYear && this.reportsByYear[reportYear]) {
                        // Update or add to new year
                        const existingIndex = this.reportsByYear[reportYear].findIndex(r => r.ID === id);
                        if (existingIndex !== -1) {
                            this.reportsByYear[reportYear][existingIndex] = updatedReport;
                        } else {
                            // Add to year cache if not present
                            this.reportsByYear[reportYear].unshift(updatedReport);
                        }
                    }
                    
                    // Update active report if it's the one being updated
                    if (this.active && this.active.ID === id) {
                        this.active = updatedReport;
                    }
                    
                    // Update latest report if necessary
                    if (this.latestReport && this.latestReport.ID === id) {
                        this.latestReport = updatedReport;
                    }
                    
                    return updatedReport;
                }
            } catch (error) {
                console.error(`Error updating report ${id}:`, error);
                throw error;
            } finally {
                this.loading = false;
            }
        },
        
        // Delete a report
        async deleteReport(id) {
            try {
                this.loading = true;
                
                const response = await apiClient.delete(`/reports/${id}`);
                
                if (response.status >= 200 && response.status < 300) {
                    // Remove from local state
                    delete this.reports[id];
                    
                    // Clear active if it was the deleted report
                    if (this.active && this.active.ID === id) {
                        this.active = null;
                    }
                    
                    // Remove from year-specific cache
                    Object.keys(this.reportsByYear).forEach(year => {
                        this.reportsByYear[year] = this.reportsByYear[year].filter(
                            report => report.ID !== id
                        );
                    });
                    
                    // Remove from summaries
                    this.reportSummaries = this.reportSummaries.filter(
                        summary => summary.ID !== id
                    );
                    
                    return true;
                }
            } catch (error) {
                console.error(`Error deleting report ${id}:`, error);
                throw error;
            } finally {
                this.loading = false;
            }
        },
        
        // Set active report
        setActiveReport(report) {
            this.active = report.ID;
        },
        
        // Clear active report
        clearActiveReport() {
            this.active = null;
        },
        
        // Clear all cached data
        clearCache() {
            this.reports = {};
            this.reportsByYear = {};
            this.reportSummaries = [];
            this.oldestReportYear = null;
            this.latestReport = null;
            this.lastEvaluatedKeys = {
                all: null,
                byYear: {},
                summaries: null,
                byAuthor: {}
            };
            this.loaded = false;
        },
        
        // Refresh all data
        async refresh() {
            this.clearCache();
            await this.init();
        }
    }
});
