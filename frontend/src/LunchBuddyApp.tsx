/// <reference types="vite/client" />

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from "./AuthContext";
import {
  Button as PFButton,
  Card as PFCard,
  CardBody,
  TextInput,
  Form,
  FormGroup,
  Title,
  Modal,
  Checkbox,
  Alert,
  AlertGroup,
  AlertActionCloseButton,
  Avatar,
  CardTitle,
  Grid,
  GridItem,
  List,
  ListItem,
  TextContent,
  Text,
  TextVariants,
  Dropdown,
  DropdownItem,
  MenuToggle,
  MenuToggleElement,
  Divider,
  Pagination,
  Select,
  SelectOption,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateFooter,
  EmptyStateActions,
  Spinner,
  Flex,
  FlexItem,
  InputGroup,
  InputGroupItem,
  Badge,
  Popover
} from "@patternfly/react-core";
import {
  Table,
  TableVariant,
  Thead,
  Tbody,
  Tr,
  Th,
  Td
} from "@patternfly/react-table";
import {
  CalendarAltIcon,
  UsersIcon,
  ClockIcon,
  MoneyBillWaveIcon,
  LightbulbIcon,
  UserFriendsIcon,
  CogIcon,
  HelpIcon,
  GithubIcon,
  MapMarkerAltIcon,
  PlusCircleIcon,
  TrashIcon,
  TimesIcon,
  CommentIcon
} from '@patternfly/react-icons';
import { BACKEND_URL } from './config';
import FeedbackForm from './components/FeedbackForm';

// --- Shared Components ---
// Moved to top to potentially help linter
const ApiErrorAlert: React.FC<{ error: string | null, context?: string }> = ({ error, context }) => {
  if (!error) return null;
  return (
    <Alert variant="danger" title={`Error${context ? ` ${context}` : ''}`} isInline>
      {error}
    </Alert>
  );
};

// --- Updated Types ---

// Registration now includes location
interface Registration {
  userId: string; // Partition Key from DynamoDB
  name: string;
  email: string;
  availableDays: string[];
  location: string; // Changed to string to match the actual data
  createdAt?: string; // Optional, added by backend
  updatedAt?: string; // Optional, added by backend
}

// Participant now includes location
interface Participant {
  userId: string;
  name: string;
  email: string;
  availableDays: string[];
  location: string; // Changed to string to match the actual data
}

// Match now includes location
interface Match {
  users: string[]; // Array of userIds
  commonDays: string[];
  location: string; // Added location
  createdAt?: string; // Optional, added by backend
}

interface MatchRound {
  matchId: string; // Primary Key from DynamoDB
  date: string;
  matches: Match[]; // Array of Match objects
}

// Statistics includes location identifier
interface Statistics {
  totalRegistrations: number;
  registrationsByDay: Record<string, number>;
  mostPopularDays: string[];
  averageDaysPerRegistration: number; // Changed to number
  recentRegistrations: number;
  location: string; // 'Global' or specific location name
  lastUpdated: string;
}

// Toast type (unchanged)
interface Toast {
  key: number;
  title: string;
  variant: "success" | "danger";
}

// Add this after the other interfaces at the top of the file
type Location = string;

// --- Constants ---
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// --- Helper Functions ---
const sortDays = (days: string[]): string[] => {
  // Handle cases where days might be undefined or null
  if (!days) return [];
  return [...days].sort((a, b) => weekdays.indexOf(a) - weekdays.indexOf(b));
};

// --- Form Components ---
// Moved RegistrationForm definition before main LunchBuddyApp component
interface RegistrationFormProps {
  registration?: Registration | null; // Existing registration for editing
  availableLocations: string[];
  onSave: (data: Omit<Registration, 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>; // Make async
  onCancel?: () => void; // Optional for edit form
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({
  registration,
  availableLocations,
  onSave,
  onCancel
}) => {
  const isEditing = !!registration;
  const { user } = useAuth(); // Get user for default values

  const [name, setName] = useState(registration?.name || user?.name || '');
  const [email, setEmail] = useState(registration?.email || user?.email || '');
  const [selectedDays, setSelectedDays] = useState<string[]>(sortDays(registration?.availableDays || []));
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>(registration?.location);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, days: false, location: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Update form if user changes (e.g., after login) and not editing
  useEffect(() => {
    if (!isEditing && user) {
      setName(user.name || '');
      setEmail(user.email || '');
      // Do not reset days/location if user logs in while filling form?
    }
  }, [user, isEditing]);
  
   // Update form fields if the registration prop changes (e.g., after saving edit)
   useEffect(() => {
       if (registration) {
           setName(registration.name);
           setEmail(registration.email);
           setSelectedDays(sortDays(registration.availableDays));
           setSelectedLocation(registration.location);
       }
   }, [registration]);

  const handleDayChange = (day: string) => {
    setSelectedDays(prev => {
      const newDays = prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day];
      return sortDays(newDays);
    });
    setTouched(prev => ({ ...prev, days: true }));
  };

  const handleLocationSelect = (_event: React.MouseEvent | React.ChangeEvent | undefined, selection: string | number | undefined) => {
    if (typeof selection === 'string') {
        setSelectedLocation(selection);
    } else if (typeof selection === 'number') {
        setSelectedLocation(String(selection));
    } else {
        setSelectedLocation('__ALL__');
    }
    setIsLocationOpen(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const dataToSave = { 
        name: name.trim(), 
        email: email.trim(), 
        availableDays: selectedDays, 
        location: selectedLocation || '' // Ensure location is a string
    };
    try {
        await onSave(dataToSave);
        // Reset form only if it was a new registration
        if (!isEditing) {
            setName(user?.name || '');
            setEmail(user?.email || '');
            setSelectedDays([]);
            setSelectedLocation(undefined);
            setTouched({ name: false, email: false, days: false, location: false });
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const isFormValid = name.trim() && 
                      email.trim() && 
                      isValidEmail(email.trim()) && 
                      selectedDays.length > 0 &&
                      !!selectedLocation;

  return (
    <Form>
      <FormGroup label="Name" isRequired fieldId="name-input">
        <TextInput
          id="name-input" value={name} type="text" isDisabled={isSubmitting}
          onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
          onChange={(_evt, value) => setName(value)}
          placeholder="Your Name"
          validated={touched.name && !name.trim() ? "error" : "default"}
        />
      {touched.name && !name.trim() && <div className="pf-v5-c-form__helper-text pf-m-error">Name is required</div>}
      </FormGroup>

      <FormGroup label="Email" isRequired fieldId="email-input">
        <TextInput
          id="email-input" value={email} type="email" isDisabled={isSubmitting}
          onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
          onChange={(_evt, value) => setEmail(value)}
          placeholder="your.email@redhat.com"
          validated={touched.email && (!email.trim() || !isValidEmail(email.trim())) ? "error" : "default"}
        />
        {touched.email && (!email.trim() || !isValidEmail(email.trim())) && <div className="pf-v5-c-form__helper-text pf-m-error">Enter a valid email address</div>}
      </FormGroup>
      
      <FormGroup label="Location" isRequired fieldId="location-select">
         <Select
             aria-label="Select Location"
             isOpen={isLocationOpen}
             selected={selectedLocation}
             onSelect={handleLocationSelect}
             onOpenChange={isOpen => setIsLocationOpen(isOpen)}
             toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsLocationOpen(!isLocationOpen)}
                    isExpanded={isLocationOpen}
                    isDisabled={isSubmitting || availableLocations.length === 0}
                    className={touched.location && !selectedLocation ? "pf-m-error" : undefined}
                >
                    {selectedLocation || "Select your primary work location"}
                </MenuToggle>
             )}
         >
             {availableLocations.length > 0 ? 
                 availableLocations.map((loc) => (
                     <SelectOption key={loc} value={loc} className="custom-select-option">{loc}</SelectOption>
                 )) :
                 <SelectOption key="loading" value="Loading locations..." isDisabled className="custom-select-option">Loading locations...</SelectOption>
             }
         </Select>
      </FormGroup>
      {touched.location && !selectedLocation && <div className="pf-v5-c-form__helper-text pf-m-error">Location is required</div>}

      <FormGroup label="Available Days" isRequired fieldId="available-days">
        <Flex spaceItems={{ default: 'spaceItemsMd' }} flexWrap={{ default: 'wrap' }}>
            {weekdays.map((day) => (
              <FlexItem key={day}>
                <Checkbox
                  label={day} id={`day-${day}`} 
                  isChecked={selectedDays.includes(day)}
                  onChange={() => handleDayChange(day)}
                  isDisabled={isSubmitting}
                />
              </FlexItem>
            ))}
        </Flex>
        {touched.days && selectedDays.length === 0 && <div className="pf-v5-c-form__helper-text pf-m-error">Select at least one day</div>}
      </FormGroup>

      <Flex spaceItems={{ default: 'spaceItemsMd' }}>
        <FlexItem>
          <PFButton
            variant="primary"
            onClick={handleSubmit}
            isDisabled={!isFormValid || isSubmitting}
            isLoading={isSubmitting}
          >
            {isEditing ? 'Update Registration' : 'Sign Up'}
          </PFButton>
        </FlexItem>
        {isEditing && onCancel && (
          <FlexItem>
            <PFButton variant="secondary" onClick={onCancel} isDisabled={isSubmitting}>
              Cancel Edit
            </PFButton>
          </FlexItem>
        )}
      </Flex>
    </Form>
  );
};


// --- Admin Components ---
// Location Management Component
const LocationManager: React.FC<{
    locations: Location[];
    onLocationsChange: (locations: Location[]) => void;
    fetchWithAuthFn: (url: string, options?: RequestInit) => Promise<Response>;
}> = ({ locations, onLocationsChange, fetchWithAuthFn }) => {
    const [newLocationName, setNewLocationName] = useState<string>('');
    const [isAdding, setIsAdding] = useState(false);
    const [deletingLocation, setDeletingLocation] = useState<string | null>(null);

    const handleAdd = async () => {
        if (!newLocationName.trim()) return;
        setIsAdding(true);
        try {
            await fetchWithAuthFn(`${BACKEND_URL}/api/locations`, {
                method: 'POST',
                body: JSON.stringify({ name: newLocationName.trim() })
            });
            onLocationsChange([...locations, newLocationName.trim()]);
            setNewLocationName(''); // Clear input on success
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (name: string) => {
        setDeletingLocation(name);
        try {
            await fetchWithAuthFn(`${BACKEND_URL}/api/locations/${encodeURIComponent(name)}`, {
                method: 'DELETE'
            });
            onLocationsChange(locations.filter(l => l !== name));
        } finally {
            setDeletingLocation(null);
        }
    };

    return (
        <PFCard isFlat>
            <CardTitle>Location Management</CardTitle>
            <CardBody>
                <div className="pf-v5-u-mt-md">
                    <Flex>
                        <FlexItem grow={{ default: "grow" }}>
                            <TextInput
                                value={newLocationName}
                                onChange={(_event, value) => setNewLocationName(value)}
                                placeholder="Enter new location name"
                                isDisabled={isAdding}
                            />
                        </FlexItem>
                        <FlexItem>
                            <PFButton
                                variant="primary"
                                onClick={handleAdd}
                                isDisabled={!newLocationName.trim() || isAdding}
                                aria-label="Add location"
                            >
                                {isAdding ? <Spinner size="sm" /> : <PlusCircleIcon />}
                            </PFButton>
                        </FlexItem>
                    </Flex>
                </div>
                <div className="pf-v5-u-mt-md">
                    {locations.map(location => (
                        <div key={location} className="pf-v5-u-mb-sm pf-v5-u-display-flex pf-v5-u-justify-content-space-between pf-v5-u-align-items-center">
                            <span>{location}</span>
                            <PFButton
                                variant="plain"
                                onClick={() => handleDelete(location)}
                                isDisabled={deletingLocation === location}
                                aria-label={`Delete ${location}`}
                            >
                                {deletingLocation === location ? <Spinner size="sm" /> : <TrashIcon />}
                            </PFButton>
                        </div>
                    ))}
                </div>
            </CardBody>
        </PFCard>
    );
};


// Updated Statistics View for Location Filtering
const StatisticsView: React.FC<{ 
    locations: Location[]; 
    selectedLocationFilter: string | null;
    onLocationFilterChange: (location: string | null) => void; 
    fetchWithAuthFn: (url: string, options?: RequestInit) => Promise<any>;
}> = ({ locations, selectedLocationFilter, onLocationFilterChange, fetchWithAuthFn }) => {
  const { user } = useAuth(); // Use user to know when to fetch
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocationSelectOpen, setIsLocationSelectOpen] = useState(false);

  // Use fetchWithAuth defined in the main component passed as prop
  const fetchStatistics = useCallback(async (locationFilter: string | null) => { 
      if (!user) return; // Should not happen if rendered correctly
      setLoading(true);
      setError(null);
      try {
        const url = new URL(`${BACKEND_URL}/api/statistics`);
        if (locationFilter) {
            url.searchParams.set('location', locationFilter);
        }
        const data = await fetchWithAuthFn(url.toString()); 
        setStats(data);
      } catch (err) {
        console.error("Error fetching statistics:", err);
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
        setStats(null); // Clear potentially stale data
      } finally {
        setLoading(false);
      }
  }, [user, fetchWithAuthFn]); // Depend on user and the passed fetch function

  // Fetch stats when filter changes or component mounts with a user
  useEffect(() => {
      fetchStatistics(selectedLocationFilter ?? null); // Explicitly pass null if undefined
  }, [selectedLocationFilter, fetchStatistics]);

  const handleLocationSelect = (_event: React.MouseEvent | React.ChangeEvent | undefined, selection: string | number | undefined) => {
      const loc = typeof selection === 'string' ? selection : undefined;
      const newSelection = loc === '__GLOBAL__' ? null : (loc ?? null);
      onLocationFilterChange(newSelection);
      setIsLocationSelectOpen(false);
  };

  return (
    <PFCard isFlat>
      <CardTitle>Statistics</CardTitle>
        <CardBody>
            <Toolbar id="statistics-toolbar" className="pf-v5-u-p-0 pf-v5-u-mb-md">
                <ToolbarContent>
                    <ToolbarGroup variant="filter-group">
                        <ToolbarItem>
                            <Select
                                aria-label="Filter Statistics by Location"
                                isOpen={isLocationSelectOpen}
                                selected={selectedLocationFilter || '__GLOBAL__'}
                                onSelect={handleLocationSelect}
                                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                                    <MenuToggle
                                        ref={toggleRef}
                                        onClick={() => setIsLocationSelectOpen(!isLocationSelectOpen)}
                                        isExpanded={isLocationSelectOpen}
                                        isDisabled={loading || locations.length === 0}
                                    >
                                        <MapMarkerAltIcon className="pf-v5-u-mr-xs" />
                                        {selectedLocationFilter ? selectedLocationFilter : "Global Statistics"}
                                    </MenuToggle>
                                )}
                            >
                                <SelectOption key="global" value="__GLOBAL__" style={{ color: 'black' }} className="custom-select-option">Global Statistics</SelectOption>
                                {locations.map(loc => (
                                    <SelectOption key={`location-${loc}`} value={loc} style={{ color: 'black' }} className="custom-select-option">{loc}</SelectOption>
                                ))}
                            </Select>
                        </ToolbarItem>
                    </ToolbarGroup>
                </ToolbarContent>
            </Toolbar>

          {loading && <div className="pf-v5-u-text-align-center pf-v5-u-py-lg"><Spinner size="xl" /></div>}
          <ApiErrorAlert error={error} context="loading statistics" />
          
          {!loading && !error && !stats && (
              <EmptyState variant="xs">
                  <EmptyStateHeader titleText="No Statistics Available" headingLevel="h4" />
                  <EmptyStateBody>Could not load statistics data{selectedLocationFilter ? ` for ${selectedLocationFilter}` : ''}.</EmptyStateBody>
              </EmptyState>
          )}

          {!loading && !error && stats && (
              <>
                <Title headingLevel="h4" size="lg" className="pf-v5-u-mb-sm">
                  Overview {(stats as Statistics).location !== 'Global' ? `(${(stats as Statistics).location})` : '(Global)'}
                </Title>
                
                <Grid hasGutter>
                  <GridItem span={6}>
                      <TextContent>
                        <Text component={TextVariants.p}>Total Reg: <strong>{stats.totalRegistrations}</strong></Text>
                        <Text component={TextVariants.p}>Recent (7d): <strong>{stats.recentRegistrations}</strong></Text>
                        <Text component={TextVariants.p}>Avg. Days: <strong>{stats.averageDaysPerRegistration}</strong></Text>
                      </TextContent>
                  </GridItem>
                  
                  <GridItem span={6}>
                    <TextContent>
                      <Text component={TextVariants.h6}>Most Popular Days</Text>
                       {stats.mostPopularDays.length > 0 ? (
                        <List isPlain>
                          {stats.mostPopularDays.map((day: string, index: number) => (
                            <ListItem key={day}>{index + 1}. {day} ({stats.registrationsByDay[day]})</ListItem>
                          ))}
                        </List>
                       ) : ( <Text component={TextVariants.small}>N/A</Text> )}
                      </TextContent>
                  </GridItem>
                  
                  <GridItem span={12}>
                    <TextContent>
                        <Text component={TextVariants.h6}>Registrations by Day</Text>
                        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
                           {weekdays.map(day => (
                             <FlexItem key={day} className="pf-v5-u-text-align-center">
                                <Text component={TextVariants.small} className="pf-v5-u-color-200">{day.substring(0,3)}</Text>
                                <Text component={TextVariants.p}><strong>{stats.registrationsByDay[day]}</strong></Text>
                             </FlexItem>
                           ))}
                        </Flex>
                       </TextContent>
                  </GridItem>
                </Grid>
                
                <div className="pf-v5-u-mt-sm pf-v5-u-color-200 pf-v5-u-font-size-sm">
                  Last updated: {new Date(stats.lastUpdated).toLocaleString()}
                </div>
              </>
          )}
        </CardBody>
    </PFCard>
  );
};

// Re-added ProgramInfoModal component
const ProgramInfoModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  return (
    <Modal
      title={
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem><UserFriendsIcon /></FlexItem>
          <FlexItem><Title headingLevel="h2" size="xl">About the Red Hat AI Lunch Buddy Program</Title></FlexItem>
        </Flex>
      }
      isOpen={isOpen}
      onClose={onClose}
      variant="large"
    >
       <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
         <FlexItem>
           <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsFlexStart' }} className="pf-v5-u-mb-sm">
              <FlexItem><CalendarAltIcon /></FlexItem>
              <FlexItem><Title headingLevel="h3" size="lg">How Often?</Title></FlexItem>
           </Flex>
           <TextContent>
             <Text component={TextVariants.p}>Welcome to the Red Hat AI Lunch Buddy Program! This program helps connect AI team members across different locations for lunch meetings. Matches are generated every 3 weeks to give everyone ample time to schedule and meet up.</Text>
           </TextContent>
         </FlexItem>
         
         <FlexItem>
           <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsFlexStart' }} className="pf-v5-u-mb-sm">
             <FlexItem><UsersIcon /></FlexItem>
             <FlexItem><Title headingLevel="h3" size="lg">How Matching Works</Title></FlexItem>
           </Flex>
           <TextContent>
              <List component="ul">
                <ListItem>Participants are matched only with others from the <strong>same location</strong>.</ListItem>
                <ListItem>Matching prioritizes pairing people based on their <strong>common available weekdays</strong>.</ListItem>
                <ListItem>The system attempts to avoid repeat matches within the last 3 rounds.</ListItem>
                <ListItem>You'll receive a <strong>Slack DM</strong> with your match's name and common available days.</ListItem>
                <ListItem>You can <strong>update your registration</strong> (days, location) at any time before the next round.</ListItem>
              </List>
           </TextContent>
         </FlexItem>
         
         <FlexItem>
           <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsFlexStart' }} className="pf-v5-u-mb-sm">
             <FlexItem><ClockIcon /></FlexItem>
             <FlexItem><Title headingLevel="h3" size="lg">Getting Started</Title></FlexItem>
           </Flex>
           <TextContent>
              <List component="ul">
                <ListItem>Log in with your Google account.</ListItem>
                <ListItem>Fill out the <strong>Sign Up</strong> form with your name, email, location, and available days.</ListItem>
                <ListItem>Wait for the next matching round notification.</ListItem>
                <ListItem>Check your Slack DMs for your match.</ListItem>
                <ListItem>Coordinate with your match to schedule lunch!</ListItem>
              </List>
           </TextContent>
         </FlexItem>
         
         <FlexItem>
           <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsFlexStart' }} className="pf-v5-u-mb-sm">
             <FlexItem><MoneyBillWaveIcon /></FlexItem>
             <FlexItem><Title headingLevel="h3" size="lg">Lunch Expenses</Title></FlexItem>
           </Flex>
            <TextContent>
              <Text component={TextVariants.p}>Red Hat typically covers the cost of lunch for program participants (check current company policy). Contact your local Red Hat AI site leader for expense guidance.</Text>
              <Text component={TextVariants.small}>Remember to keep your receipts!</Text>
           </TextContent>
         </FlexItem>
         
         <FlexItem>
           <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsFlexStart' }} className="pf-v5-u-mb-sm">
              <FlexItem><LightbulbIcon /></FlexItem>
              <FlexItem><Title headingLevel="h3" size="lg">Tips for Success</Title></FlexItem>
           </Flex>
           <TextContent>
               <List component="ul">
                 <ListItem>Keep your available days accurate.</ListItem>
                 <ListItem>Respond promptly to your match's messages.</ListItem>
                 <ListItem>Be flexible with scheduling.</ListItem>
                 <ListItem>If you need to cancel, let your match know ASAP.</ListItem>
               </List>
            </TextContent>
         </FlexItem>
       </Flex>
    </Modal>
  );
};

// Re-added CountdownTile component
const CountdownTile: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<string>('Calculating...');
  
  // Simplified: Just show a static message for now. 
  // A real implementation might fetch the next match date from the backend.
  useEffect(() => {
     setTimeLeft('Approx. 3 weeks'); // Placeholder
  }, []);
  
  return (
    <PFCard className="pf-v5-u-h-100">
      <CardBody>
        <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }} className="pf-v5-u-text-align-center">
           <FlexItem><CalendarAltIcon /></FlexItem>
           <FlexItem><Title headingLevel="h3" size="lg">Next Match Round In</Title></FlexItem>
           <FlexItem><Text component={TextVariants.h1} className="pf-v5-u-font-size-2xl">{timeLeft}</Text></FlexItem>
           <FlexItem><Text component={TextVariants.small}>Matches sent periodically.</Text></FlexItem>
        </Flex>
      </CardBody>
    </PFCard>
  );
};

// --- Main App Component ---
const LunchBuddyApp = () => {
  const { user, loading: authLoading, login, logout } = useAuth();
  
  // --- State ---
  // Consolidate registration form state into one object for easier clearing
  const [formState, setFormState] = useState({
      name: '',
      email: '',
      selectedDays: [] as string[],
      selectedLocation: undefined as string | undefined,
      touched: { name: false, email: false, days: false, location: false }
  });
  const [isEditing, setIsEditing] = useState(false);

  // Data State
  const [myRegistration, setMyRegistration] = useState<Registration | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchRound[]>([]);
  const [allRegistrationsForHistory, setAllRegistrationsForHistory] = useState<Registration[]>([]); // Needed to display names in history

  // UI State
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isProgramInfoModalOpen, setIsProgramInfoModalOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isMatchHistoryModalOpen, setIsMatchHistoryModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [page, setPage] = useState(1); // For participant pagination
  const [perPage, setPerPage] = useState(10); // For participant pagination
  // State for Select dropdowns being open
  const [isParticipantFilterOpen, setIsParticipantFilterOpen] = useState(false);
  const [isHistoryFilterOpen, setIsHistoryFilterOpen] = useState(false);

  // Loading & Error State
  const [isDataLoading, setIsDataLoading] = useState(true); // Combined loading state for initial data
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submissions and admin actions
  const [appError, setAppError] = useState<string | null>(null); // General app-level errors

  // Filtering State
  const [participantLocationFilter, setParticipantLocationFilter] = useState<string | null>(null);
  const [historyLocationFilter, setHistoryLocationFilter] = useState<string | null>(null);
  const [statsLocationFilter, setStatsLocationFilter] = useState<string | null>(null);

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const isDevelopment = import.meta.env.DEV;

  // --- Helper Functions ---
  const showToast = useCallback((title: string, variant: "success" | "danger") => {
    const key = new Date().getTime();
    // Limit number of toasts shown? Not critical now.
    setToasts((prev) => [...prev, { key, title, variant }]);
  }, []);

  const clearForm = useCallback((useUserData = true) => {
        setFormState({
            name: useUserData ? (user?.name || '') : '',
            email: useUserData ? (user?.email || '') : '',
            selectedDays: [],
            selectedLocation: undefined,
            touched: { name: false, email: false, days: false, location: false }
        });
      setIsEditing(false);
  }, [user]);

  // --- API Call Functions ---
  // Reverted fetchWithAuth to use localStorage
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('auth_token'); // Use localStorage
    if (!token) {
        logout(); // Force logout if token is missing
        throw new Error('Authentication token not found. Please log in again.');
    }
    
    const headers = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' // Default content type
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { error: `Request failed: ${response.statusText} (${response.status})` };
        }
        // Handle specific auth errors
        if (response.status === 401) {
            logout(); // Force logout only on 401 (unauthorized)
            throw new Error(errorData.error || 'Authentication failed. Please log in again.');
        }
        // For 403 (forbidden), just throw the error without logging out
        throw new Error(errorData.error || errorData.message || `Request failed: ${response.statusText} (${response.status})`);
    }
    
    // Handle potential empty responses (e.g., from DELETE)
     const text = await response.text();
     try {
         return text ? JSON.parse(text) : { success: true }; // Return success object for empty 2xx responses
     } catch (e) {
         console.warn("Could not parse JSON response, returning raw text:", text);
         return { success: true, raw: text }; // Indicate success but maybe non-JSON
     }
  }, [logout]); // Added logout dependency

  // Fetch initial data needed by the app
  const loadInitialData = useCallback(async () => {
      if (!user) {
          setIsDataLoading(false);
          setMyRegistration(null);
          setParticipants([]);
          setLocations([]);
          setIsAdmin(false);
          clearForm(false); // Clear form without user data
          return;
      };

      setIsDataLoading(true);
      setAppError(null);
      try {
          console.log('Loading initial data for user:', user.email);
          // Fetch locations first as it might be needed by registration form
          const locationsData = await fetchWithAuth(`${BACKEND_URL}/api/locations`);
          setLocations(locationsData || []);
          console.log('Locations loaded:', locationsData);
          
          // Fetch registration, participants, admin status in parallel
          const [regData, participantsData, adminData] = await Promise.all([
              fetchWithAuth(`${BACKEND_URL}/api/my-registration`).catch(err => {
                   console.warn('Could not load user registration:', err.message); // Non-fatal usually
                   return null; // Default to null if fetch fails
              }),
              fetchWithAuth(`${BACKEND_URL}/api/participants`).catch(err => {
                  console.error('Failed to load participants:', err.message); 
                  showToast('Failed to load participants list.', 'danger');
                  return []; // Default to empty array
              }),
              fetchWithAuth(`${BACKEND_URL}/api/is-admin`).catch(err => {
                  // If we get a 403, it means the user is not an admin
                  if (err.message.includes('403')) {
                      console.log('User is not an admin');
                      return { isAdmin: false };
                  }
                  console.error('Failed to check admin status:', err.message);
                  return { isAdmin: false }; // Default to non-admin on error
              })
          ]);
          
          console.log('Registration loaded:', regData);
          setMyRegistration(regData);
          // Initialize form state based on registration or user data
          if (regData) {
              setFormState({
                  name: regData.name,
                  email: regData.email,
                  selectedDays: sortDays(regData.availableDays),
                  selectedLocation: regData.location,
                  touched: { name: false, email: false, days: false, location: false }
              });
          } else {
             clearForm(true); // Clear form using user data if no registration
          }

          console.log('Participants loaded:', participantsData);
          setParticipants(participantsData || []);

          console.log('Admin Status determined:', adminData);
          setIsAdmin(adminData?.isAdmin || false);

      } catch (err) {
          console.error("Failed to load initial data:", err);
          setAppError(err instanceof Error ? err.message : 'Failed to load application data. Please try refreshing.');
          // Set safe defaults on major error
          setMyRegistration(null);
          setParticipants([]);
          setLocations([]); // Keep locations if fetched?
          setIsAdmin(false);
          clearForm(false);
      } finally {
          setIsDataLoading(false);
      }
  }, [user, fetchWithAuth, showToast, clearForm]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]); // Rerun when user changes

  // Fetch participants when filter changes (debounced?)
  const loadParticipants = useCallback(async (locationFilter: string | null) => {
      if (!user) return; // Don't fetch if not logged in
      // Decide on loading indicator strategy - maybe just disable table?
      // setIsDataLoading(true); 
      console.log(`Fetching participants for filter: ${locationFilter || 'All'}`);
      try {
          const url = new URL(`${BACKEND_URL}/api/participants`);
          if (locationFilter) {
              url.searchParams.set('location', locationFilter);
          }
          const participantsData = await fetchWithAuth(url.toString());
          setParticipants(participantsData || []);
          setPage(1); // Reset pagination on filter change
      } catch (err) {
          console.error("Failed to load participants:", err);
          showToast(err instanceof Error ? err.message : 'Failed to load participants list.', 'danger');
          setParticipants([]); // Clear on error
      } finally {
         // setIsDataLoading(false); 
      }
  }, [user, fetchWithAuth, showToast]);

  useEffect(() => {
      // Load participants initially and whenever the filter changes
      // Skip initial load here as loadInitialData handles it
      if (!isDataLoading) { // Avoid fetching while initial load is happening
         loadParticipants(participantLocationFilter);
      }
  }, [participantLocationFilter, loadParticipants, isDataLoading]);


  // --- Event Handlers ---

  const handleEditClick = () => {
    if (myRegistration) {
        setFormState({ // Set form state from registration
             name: myRegistration.name || '',
             email: myRegistration.email || '',
             selectedDays: sortDays(myRegistration.availableDays || []),
             selectedLocation: myRegistration.location,
             touched: { name: false, email: false, days: false, location: false }
        });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form state from stored registration data
    if (myRegistration) {
        setFormState({
             name: myRegistration.name,
             email: myRegistration.email,
             selectedDays: sortDays(myRegistration.availableDays),
             selectedLocation: myRegistration.location,
             touched: { name: false, email: false, days: false, location: false }
        });
    } else {
        clearForm(true); // Should not happen if editing, but safety first
    }
  };
  
  // Handles both New and Edit submissions
  const handleSaveRegistration = async (data: Omit<Registration, 'userId' | 'createdAt' | 'updatedAt'>) => {
      if (!user) {
          showToast("Please login first", "danger");
          return;
      }
      
      setIsSubmitting(true);
      const endpoint = isEditing ? "/api/registration" : "/api/register";
      const method = isEditing ? "PUT" : "POST";
      
      try {
          const savedRegistration = await fetchWithAuth(`${BACKEND_URL}${endpoint}`, {
              method,
              body: JSON.stringify(data)
          });

          setMyRegistration(savedRegistration);
          setIsEditing(false); // Exit editing mode on successful save
          // Update form state to reflect saved data
          setFormState(prev => ({ 
              ...prev, 
              name: savedRegistration.name,
              email: savedRegistration.email,
              selectedDays: sortDays(savedRegistration.availableDays),
              selectedLocation: savedRegistration.location,
              touched: { name: false, email: false, days: false, location: false }
           }));
          showToast(isEditing ? "Registration updated!" : "Registration successful!", "success");
          
          // Optimistically update participant list or re-fetch
          loadParticipants(participantLocationFilter); 

      } catch (err) {
          console.error(`Failed to ${isEditing ? 'update' : 'create'} registration:`, err);
          showToast(err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'save'} registration.`, 'danger');
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleCancelRegistration = async () => {
    if (!myRegistration) return;
    if (!confirm('Are you sure you want to cancel your registration? This will remove you from the program.')) return;

    setIsSubmitting(true); // Use submitting state to disable buttons
    try {
      await fetchWithAuth(`${BACKEND_URL}/api/registration`, { method: "DELETE" });
      showToast("Registration cancelled successfully", "success");
      setMyRegistration(null);
      clearForm(true); // Reset form to initial state using user data
      loadParticipants(participantLocationFilter); // Refresh participant list
    } catch (err) {
      console.error("Cancel registration error:", err);
      showToast(err instanceof Error ? err.message : 'Failed to cancel registration.', "danger");
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- Admin Action Handlers ---
  const handleAdminAddLocation = async (name: string) => {
      setIsSubmitting(true);
      try {
          await fetchWithAuth(`${BACKEND_URL}/api/locations`, {
              method: 'POST',
              body: JSON.stringify({ name })
          });
          showToast(`Location "${name}" added successfully!`, 'success');
          // Refresh locations list
          const updatedLocations = await fetchWithAuth(`${BACKEND_URL}/api/locations`);
          setLocations(updatedLocations || []);
      } catch (err) {
          console.error("Failed to add location:", err);
          showToast(err instanceof Error ? err.message : 'Failed to add location.', 'danger');
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleAdminDeleteLocation = async (name: string) => {
      if (!confirm(`Are you sure you want to delete the location "${name}"? This cannot be undone and may fail if participants are registered there.`)) return;
      setIsSubmitting(true);
      try {
          await fetchWithAuth(`${BACKEND_URL}/api/locations/${encodeURIComponent(name)}`, {
              method: 'DELETE'
          });
          showToast(`Location "${name}" deleted successfully!`, 'success');
          // Refresh locations list
          const updatedLocations = await fetchWithAuth(`${BACKEND_URL}/api/locations`);
          setLocations(updatedLocations || []);
          // Clear filters if the deleted location was selected
          if (participantLocationFilter === name) setParticipantLocationFilter(null);
          if (historyLocationFilter === name) setHistoryLocationFilter(null);
          if (statsLocationFilter === name) setStatsLocationFilter(null);
      } catch (err) {
          console.error("Failed to delete location:", err);
          showToast(err instanceof Error ? err.message : 'Failed to delete location.', 'danger');
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleAdminMatch = async () => {
      if (!confirm('Are you sure you want to generate new matches now? This will trigger Slack notifications to matched participants.')) return;
      setIsSubmitting(true); // Indicate processing
      try {
        const matches = await fetchWithAuth(`${BACKEND_URL}/api/match`, { method: 'POST' });
        showToast(
          isDevelopment 
            ? `Test matches generated (${matches?.length || 0})! Check server logs.`
            : `Matching complete (${matches?.length || 0})! Slack DMs sent.`,
          'success'
        );
        console.log('Matches generated:', matches);
        // Optionally refresh history view if open?
         if (isMatchHistoryModalOpen) {
             handleAdminViewMatchHistory(historyLocationFilter); // Refresh history data
         }
      } catch (error) {
        console.error('Error generating matches:', error);
        showToast(error instanceof Error ? error.message : 'Failed to generate matches', 'danger');
      } finally {
        setIsSubmitting(false);
      }
  };

  const handleAdminGenerateTestData = async () => {
       if (!confirm('Generate test data? This will clear and replace existing test user registrations.')) return;
       setIsSubmitting(true);
       try {
           const data = await fetchWithAuth(`${BACKEND_URL}/api/generate-test-data`, { method: 'POST' });
           showToast('Test data generated successfully!', 'success');
           console.log('Generated test registrations:', data.registrations);
           // Refresh participants and locations as test data might add them
           loadParticipants(null); // Load all participants after generating test data
           setParticipantLocationFilter(null); // Reset filter
           const updatedLocations = await fetchWithAuth(`${BACKEND_URL}/api/locations`);
           setLocations(updatedLocations || []);
       } catch (error) {
           console.error('Error generating test data:', error);
           showToast(error instanceof Error ? error.message : 'Failed to generate test data', 'danger');
       } finally {
           setIsSubmitting(false);
       }
  };

  const handleAdminViewMatchHistory = async (locationFilter: string | null) => {
      setIsMatchHistoryModalOpen(true); // Open modal immediately
      setIsDataLoading(true); // Use main loader? Or modal loader?
      // setError(null); // Don't clear app error maybe
      try {
          const url = new URL(`${BACKEND_URL}/api/match-history`);
          if (locationFilter) {
              url.searchParams.set('location', locationFilter);
          }
          // Fetch history and *all* registrations needed to display names
          const [historyData, allRegData] = await Promise.all([
               fetchWithAuth(url.toString()),
               fetchWithAuth(`${BACKEND_URL}/api/participants`) // Fetch all regs for lookup
          ]);

          setMatchHistory(historyData || []);
          setAllRegistrationsForHistory(allRegData || []);

      } catch (error) {
          console.error("❌ Error fetching match history:", error);
          showToast(error instanceof Error ? error.message : 'Failed to fetch match history', 'danger');
          setMatchHistory([]); // Clear potentially stale data
          setAllRegistrationsForHistory([]);
          // Maybe close modal on error?
          // setIsMatchHistoryModalOpen(false);
      } finally {
         setIsDataLoading(false);
      }
  };

  const handleSubmitFeedback = async (feedback: string) => {
    try {
      await fetchWithAuth(`${BACKEND_URL}/api/feedback`, {
        method: 'POST',
        body: JSON.stringify({ feedback })
      });
      showToast('Feedback submitted successfully!', 'success');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      showToast('Failed to submit feedback. Please try again.', 'danger');
      throw error;
    }
  };

  const handleAdminModalOpen = async () => {
    setIsAdminModalOpen(true);
    setIsDataLoading(true);
    try {
      // Refresh locations and other admin data
      const [locationsData, adminData] = await Promise.all([
        fetchWithAuth(`${BACKEND_URL}/api/locations`).catch(err => {
          console.warn('Could not load locations:', err.message);
          return [];
        }),
        fetchWithAuth(`${BACKEND_URL}/api/is-admin`).catch(err => {
          console.error('Failed to check admin status:', err.message);
          return { isAdmin: false };
        })
      ]);
      
      setLocations(locationsData || []);
      setIsAdmin(adminData?.isAdmin || false);
    } catch (err) {
      console.error("Failed to load admin data:", err);
      showToast(err instanceof Error ? err.message : 'Failed to load admin data', 'danger');
    } finally {
      setIsDataLoading(false);
    }
  };

  // --- Render Logic ---

  if (authLoading || (isDataLoading && !user)) { // Show spinner only during auth load or initial data load without user
    return <div className="pf-v5-u-display-flex pf-v5-u-justify-content-center pf-v5-u-align-items-center pf-v5-u-h-100"><Spinner size="xl" /></div>;
  }

  // Filter participants based on state
  const filteredParticipants = participantLocationFilter 
      ? participants.filter(p => p.location === participantLocationFilter) 
      : participants;
      
  const paginatedParticipants = filteredParticipants.slice((page - 1) * perPage, page * perPage);

  // ----- JSX -----
  return (
    <div className="pf-v5-c-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>      
      {/* --- Header --- */}
      <header className="pf-v5-c-page__header">
        <div className="pf-v5-c-page__header-brand">
          <div className="pf-v5-c-page__header-brand-toggle" style={{ marginRight: '20px' }}>
            <img src="/redhat-logo.png" alt="Red Hat" style={{ height: '40px', width: 'auto' }} />
          </div>
          <div className="pf-v5-c-page__header-brand-link">
            <Title headingLevel="h1" size="2xl">Red Hat AI Lunch Buddy Program</Title>
          </div>
        </div>
        <div className="pf-v5-c-page__header-tools">
          {user ? (
            <Flex spaceItems={{ default: 'spaceItemsMd' }} alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>
                 <Popover
                    aria-label="Source Code Link"
                    headerContent={<div>View Source Code</div>}
                    bodyContent={<div>Visit the GitHub repository for this project.</div>}
                    triggerAction="hover"
                    position="bottom"
                  >
                    <a href="https://github.com/accorvin/lunch-buddies" target="_blank" rel="noopener noreferrer" className="pf-v5-c-button pf-m-plain" aria-label="View source code on GitHub">
                      <GithubIcon />
                    </a>
                  </Popover>
              </FlexItem>
              {isAdmin && (
                <FlexItem>
                   <Popover
                      aria-label="Admin Settings Info"
                      headerContent={<div>Admin Dashboard</div>}
                      bodyContent={<div>Manage locations, view statistics, trigger matching, and view history.</div>}
                      triggerAction="hover"
                      position="bottom"
                    >
                       <PFButton 
                         variant="plain" 
                         aria-label="Admin settings" 
                         onClick={handleAdminModalOpen} 
                         icon={<CogIcon />} 
                         isDisabled={isSubmitting} 
                       />
                   </Popover>
                </FlexItem>
              )}
              <FlexItem>
                <Dropdown
                  isOpen={isUserDropdownOpen}
                  onSelect={() => setIsUserDropdownOpen(false)}
                  toggle={(toggleRef: React.RefObject<MenuToggleElement>) => (
                    <MenuToggle ref={toggleRef} onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)} isExpanded={isUserDropdownOpen} variant="plain">
                       <Avatar src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=32`} alt={user.name} size="md" />
                    </MenuToggle>
                  )}
                  popperProps={{
                       position: 'right' // Align dropdown menu
                  }}
                >
                  <DropdownItem key="name" isDisabled><strong>{user.name}</strong></DropdownItem>
                  <DropdownItem key="email" isDisabled><small>{user.email}</small></DropdownItem>
                  <Divider component="li" />
                  <DropdownItem key="logout" onClick={logout}>Log out</DropdownItem>
                </Dropdown>
              </FlexItem>
            </Flex>
          ) : (
            <PFButton variant="primary" onClick={login}>Login with Google</PFButton>
          )}
        </div>
      </header>

      {/* --- Main Content --- */}
      <div className="pf-v5-c-page__main" style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
        <div className="pf-v5-c-page__main-section pf-m-light pf-m-padding-on-xl" style={{ flex: '1 1 auto' }}>
          {/* Toast Notifications */}
          <AlertGroup isToast isLiveRegion>
            {toasts.map(({ key, title, variant }) => (
              <Alert key={key} variant={variant} title={title} timeout={5000} actionClose={<AlertActionCloseButton onClose={() => setToasts((prev) => prev.filter((t) => t.key !== key))} />} />
            ))}
          </AlertGroup>
          
          {/* App Level Error Display */}
           <ApiErrorAlert error={appError} context="loading application data" />

          {/* Welcome Banner */}
          <PFCard className="pf-v5-u-mb-lg">
            <CardBody>
              <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
                 <FlexItem>
                   <Title headingLevel="h2" size="xl" className="pf-v5-u-mb-sm">Welcome to the Red Hat AI Lunch Buddy Program!</Title>
                   <Text component={TextVariants.p}>Connect with fellow AI team members at your location for lunch and networking.</Text>
                 </FlexItem>
                 <FlexItem>
                   <PFButton variant="link" icon={<HelpIcon />} onClick={() => setIsProgramInfoModalOpen(true)}>About the Program</PFButton>
                 </FlexItem>
              </Flex>
            </CardBody>
          </PFCard>

          {/* --- Logged In Content --- */}
          {user ? (
            <Grid hasGutter>
              {/* Registration Card */}
              <GridItem span={12} lg={8}>
                 <PFCard className="pf-v5-u-h-100">
                    <CardTitle>{isEditing ? 'Edit Your Registration' : (myRegistration ? 'Your Current Registration' : 'Sign Up')}</CardTitle>
                    <CardBody>
                       {isDataLoading ? <Spinner size="lg" /> : (
                          <>
                            {myRegistration && !isEditing && (
                                <div>
                                    <List isPlain>
                                        <ListItem><strong>Name:</strong> {myRegistration.name}</ListItem>
                                        <ListItem><strong>Email:</strong> {myRegistration.email}</ListItem>
                                        <ListItem><strong>Location:</strong> <Badge isRead>{myRegistration.location}</Badge></ListItem>
                                        <ListItem><strong>Available Days:</strong> {sortDays(myRegistration.availableDays).join(", ")}</ListItem>
                                    </List>
                                    <Flex spaceItems={{ default: 'spaceItemsMd' }} className="pf-v5-u-mt-md">
                                      <FlexItem><PFButton variant="secondary" onClick={handleEditClick} isDisabled={isSubmitting}>Edit Registration</PFButton></FlexItem>
                                      <FlexItem><PFButton variant="danger" onClick={handleCancelRegistration} isDisabled={isSubmitting}>Cancel Registration</PFButton></FlexItem>
                                    </Flex>
                                </div>
                            )}
                            {(isEditing || !myRegistration) && (
                                <RegistrationForm 
                                    registration={isEditing ? myRegistration : null}
                                    availableLocations={locations}
                                    onSave={handleSaveRegistration}
                                    onCancel={isEditing ? handleCancelEdit : undefined}
                                />
                            )}
                          </>
                       )}
                    </CardBody>
                 </PFCard>
              </GridItem>

              {/* Countdown Tile */}
              <GridItem span={12} lg={4}>
                 <CountdownTile />
              </GridItem>

              {/* Participants List Card */}
              <GridItem span={12}>
                 <PFCard>
                    <CardTitle>Current Participants</CardTitle>
                    <CardBody>
                        {isDataLoading ? <Spinner/> : (
                           <>
                               <Toolbar id="participants-toolbar" clearAllFilters={() => setParticipantLocationFilter(null)} collapseListedFiltersBreakpoint="lg">
                                  <ToolbarContent>
                                      <ToolbarGroup variant="filter-group">
                                         <ToolbarItem>
                                            <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                                              <FlexItem>
                                                <Select
                                                    aria-label="Filter Participants by Location"
                                                    isOpen={isParticipantFilterOpen}
                                                    selected={participantLocationFilter || '__ALL__'}
                                                    onSelect={(_e, selection) => {
                                                        const loc = selection === '__ALL__' ? null : String(selection);
                                                        setParticipantLocationFilter(loc);
                                                        setIsParticipantFilterOpen(false);
                                                    }}
                                                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                                                        <MenuToggle
                                                            ref={toggleRef}
                                                            onClick={() => setIsParticipantFilterOpen(!isParticipantFilterOpen)}
                                                            isExpanded={isParticipantFilterOpen}
                                                            isDisabled={locations.length === 0}
                                                        >
                                                            <MapMarkerAltIcon className="pf-v5-u-mr-xs" />
                                                            {participantLocationFilter ? participantLocationFilter : "All Locations"}
                                                        </MenuToggle>
                                                    )}
                                                >
                                                    <SelectOption key="all" value="__ALL__" style={{ color: 'black' }} className="custom-select-option">All Locations</SelectOption>
                                                    {locations.map(loc => (
                                                        <SelectOption 
                                                            key={loc} 
                                                            value={loc} 
                                                            style={{ color: 'black' }} 
                                                            className="custom-select-option"
                                                        >
                                                            {loc}
                                                        </SelectOption>
                                                    ))}
                                                </Select>
                                            </FlexItem>
                                            {participantLocationFilter && (
                                                 <FlexItem>
                                                     <PFButton variant="link" icon={<TimesIcon />} onClick={() => setParticipantLocationFilter(null)}>Clear Filter</PFButton>
                                                 </FlexItem>
                                            )}
                                        </Flex>
                                    </ToolbarItem>
                                 </ToolbarGroup>
                                  <ToolbarItem variant="pagination" align={{ default: 'alignRight' }}>
                                     <Pagination
                                         itemCount={filteredParticipants.length}
                                         perPage={perPage}
                                         page={page}
                                         onSetPage={(_evt, newPage) => setPage(newPage)}
                                         onPerPageSelect={(_evt, newPerPage) => { setPerPage(newPerPage); setPage(1); }}
                                         variant="top"
                                         isCompact
                                     />
                                 </ToolbarItem>
                             </ToolbarContent>
                          </Toolbar>
                           {filteredParticipants.length === 0 ? (
                               <EmptyState variant="sm" className="pf-v5-u-pt-lg pf-v5-u-pb-lg">
                                   <EmptyStateHeader titleText="No Participants Found" headingLevel="h4" icon={<EmptyStateIcon icon={UsersIcon} />} />
                                   <EmptyStateBody>
                                      {participantLocationFilter ? `No participants found for location "${participantLocationFilter}".` : (participants.length > 0 ? 'Select a location filter.' : 'No participants have registered yet.')}
                                   </EmptyStateBody>
                               </EmptyState>
                           ) : (
                               <Table aria-label="Participants Table" variant={TableVariant.compact}>
                                   <Thead>
                                       <Tr>
                                           <Th>Name</Th>
                                           <Th>Email</Th>
                                           <Th>Location</Th>
                                           <Th>Available Days</Th>
                                       </Tr>
                                   </Thead>
                                   <Tbody>
                                       {paginatedParticipants.map((p) => (
                                           <Tr key={p.userId}>
                                               <Td dataLabel="Name">{p.name}</Td>
                                               <Td dataLabel="Email">{p.email}</Td>
                                               <Td dataLabel="Location"><Badge isRead>{p.location}</Badge></Td>
                                               <Td dataLabel="Available Days">{sortDays(p.availableDays).join(", ") || "—"}</Td>
                                           </Tr>
                                       ))}
                                   </Tbody>
                               </Table>
                           )}
                           {filteredParticipants.length > perPage && (
                                <Pagination
                                    itemCount={filteredParticipants.length}
                                    perPage={perPage}
                                    page={page}
                                    onSetPage={(_evt, newPage) => setPage(newPage)}
                                    onPerPageSelect={(_evt, newPerPage) => { setPerPage(newPerPage); setPage(1); }}
                                    variant="bottom"
                                    className="pf-v5-u-mt-md"
                                    isCompact
                                />
                           )}
                          </>
                       )}
                    </CardBody>
                 </PFCard>
              </GridItem>
            </Grid>
          ) : (
          /* --- Logged Out Content --- */
            <Grid>
              <GridItem span={12}>
                 <PFCard>
                    <CardBody>
                        <EmptyState>
                             <EmptyStateHeader titleText="Please Login to Continue" headingLevel="h2" icon={<EmptyStateIcon icon={MapMarkerAltIcon}/>} />
                             <EmptyStateBody>
                                 Sign in with your Google account to participate in the Lunch Buddy program.
                             </EmptyStateBody>
                             <EmptyStateFooter>
                                <EmptyStateActions>
                                    <PFButton variant="primary" onClick={login}>Login with Google</PFButton>
                                </EmptyStateActions>
                             </EmptyStateFooter>
                        </EmptyState>
                    </CardBody>
                 </PFCard>
              </GridItem>
            </Grid>
          )}
        </div>
      </div>

      {/* --- Modals --- */}
      <ProgramInfoModal isOpen={isProgramInfoModalOpen} onClose={() => setIsProgramInfoModalOpen(false)} />

      {/* Admin Modal */}
       <Modal
           variant="large"
           title="Admin Dashboard"
           isOpen={isAdminModalOpen}
           onClose={() => setIsAdminModalOpen(false)}
           actions={[ <PFButton key="close" variant="primary" onClick={() => setIsAdminModalOpen(false)}> Close </PFButton> ]}
       >
           {isDataLoading ? <Spinner/> : (
               <Grid hasGutter>
                   <GridItem span={12} md={6}>
                        <LocationManager 
                            locations={locations} 
                            onLocationsChange={setLocations}
                            fetchWithAuthFn={fetchWithAuth}
                        />
                   </GridItem>
                    <GridItem span={12} md={6}>
                       <PFCard isFlat className="pf-v5-u-h-100">
                           <CardTitle>Actions</CardTitle>
                           <CardBody>
                                <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
                                    <FlexItem>
                                        <PFButton variant="primary" onClick={handleAdminMatch} isLoading={isSubmitting} isDisabled={isSubmitting}>Generate Matches Now</PFButton>
                                    </FlexItem>
                                    <FlexItem>
                                        <PFButton variant="secondary" onClick={() => handleAdminViewMatchHistory(historyLocationFilter)} isLoading={isSubmitting} isDisabled={isSubmitting}>View Match History</PFButton>
                                    </FlexItem>
                                    {isDevelopment && (
                                         <FlexItem>
                                            <PFButton variant="secondary" onClick={handleAdminGenerateTestData} isLoading={isSubmitting} isDisabled={isSubmitting}>Generate Test Data</PFButton>
                                        </FlexItem>
                                    )}
                                 </Flex>
                           </CardBody>
                       </PFCard>
                    </GridItem>
                   <GridItem span={12}>
                       <StatisticsView 
                            locations={locations}
                            selectedLocationFilter={statsLocationFilter}
                            onLocationFilterChange={setStatsLocationFilter} 
                            fetchWithAuthFn={fetchWithAuth}
                       />
                   </GridItem>
               </Grid>
           )}
       </Modal>

      {/* Match History Modal */}
      <Modal
        variant="large"
        width="80%"
        title="Match History"
        isOpen={isMatchHistoryModalOpen}
        onClose={() => setIsMatchHistoryModalOpen(false)}
        actions={[ <PFButton key="close" variant="primary" onClick={() => setIsMatchHistoryModalOpen(false)}> Close </PFButton> ]}
      >
          {isDataLoading ? <Spinner/> : (
              <>
                 <Toolbar id="history-toolbar" clearAllFilters={() => setHistoryLocationFilter(null)}>
                    <ToolbarContent>
                        <ToolbarGroup variant="filter-group">
                           <ToolbarItem>
                                <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                                    <FlexItem>
                                        <Select
                                            aria-label="Filter History by Location"
                                            isOpen={isHistoryFilterOpen}
                                            selected={historyLocationFilter || '__ALL__'}
                                            onSelect={(_e, selection) => {
                                                const loc = selection === '__ALL__' ? null : String(selection);
                                                setHistoryLocationFilter(loc);
                                                setIsHistoryFilterOpen(false);
                                            }}
                                            toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                                                <MenuToggle
                                                    ref={toggleRef}
                                                    onClick={() => setIsHistoryFilterOpen(!isHistoryFilterOpen)}
                                                    isExpanded={isHistoryFilterOpen}
                                                    isDisabled={locations.length === 0}
                                                >
                                                    <MapMarkerAltIcon className="pf-v5-u-mr-xs" />
                                                    {historyLocationFilter ? historyLocationFilter : "All Locations"}
                                                </MenuToggle>
                                            )}
                                        >
                                            <SelectOption key="all" value="__ALL__" style={{ color: 'black' }} className="custom-select-option">All Locations</SelectOption>
                                            {locations.map(loc => (
                                                <SelectOption key={loc} value={loc} style={{ color: 'black' }} className="custom-select-option">{loc}</SelectOption>
                                            ))}
                                        </Select>
                                    </FlexItem>
                                     {historyLocationFilter && (
                                        <FlexItem>
                                             <PFButton variant="link" icon={<TimesIcon />} onClick={() => setHistoryLocationFilter(null)}>Clear Filter</PFButton>
                                         </FlexItem>
                                    )}
                                </Flex>
                           </ToolbarItem>
                           <ToolbarItem>
                               <PFButton variant="link" onClick={() => handleAdminViewMatchHistory(historyLocationFilter)} isDisabled={isDataLoading}>Refresh</PFButton>
                           </ToolbarItem>
                        </ToolbarGroup>
                    </ToolbarContent>
                 </Toolbar>
          
                 <div className="pf-v5-l-stack pf-m-gutter pf-v5-u-pt-md" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {matchHistory.length === 0 ? (
                         <EmptyState variant="sm">
                             <EmptyStateHeader titleText="No Match History Found" headingLevel="h4" icon={<EmptyStateIcon icon={UsersIcon}/>} />
                             <EmptyStateBody>
                                {historyLocationFilter ? `No matches found for location "${historyLocationFilter}".` : 'No matches have been generated yet.'}
                             </EmptyStateBody>
                         </EmptyState>
                    ) : (
                      matchHistory.map((round, roundIndex) => (
                        <PFCard key={round.matchId} isFlat isCompact className="pf-v5-u-mb-sm">
                            <CardTitle>Round {matchHistory.length - roundIndex} ({new Date(round.date).toLocaleDateString()})</CardTitle>
                            <CardBody className="pf-v5-u-p-sm">
                                <Table aria-label={`Match round ${matchHistory.length - roundIndex}`} variant={TableVariant.compact} borders={false}>
                                    <Thead>
                                        <Tr>
                                            <Th width={50}>Participants</Th>
                                            <Th width={20}>Location</Th>
                                            <Th width={30}>Common Days</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {round.matches.map((match, matchIndex) => {
                                            // Lookup names - This is inefficient if list is huge, consider backend join/lookup
                                            const person1 = allRegistrationsForHistory.find(r => r.userId === match.users[0]);
                                            const person2 = allRegistrationsForHistory.find(r => r.userId === match.users[1]);
                                            
                                            return (
                                                <Tr key={`${round.matchId}-${matchIndex}`}>
                                                    <Td dataLabel="Participants">
                                                         {person1?.name || `ID: ${match.users[0]}`} & {person2?.name || `ID: ${match.users[1]}`}
                                                    </Td>
                                                    <Td dataLabel="Location"><Badge isRead>{match.location}</Badge></Td>
                                                    <Td dataLabel="Common Days">{sortDays(match.commonDays).join(", ")}</Td>
                                                </Tr>
                                            );
                                        })}
                                    </Tbody>
                                </Table>
                            </CardBody>
                        </PFCard>
                      ))
                    )}
                 </div>
               </>
           )}
      </Modal>

      {/* Feedback Button */}
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 2000
      }}>
        <PFButton
          variant="primary"
          onClick={() => setIsFeedbackModalOpen(true)}
          icon={<CommentIcon />}
          style={{ 
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            padding: '0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          aria-label="Provide feedback"
        />
      </div>

      {/* Feedback Form Modal */}
      <FeedbackForm
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        onSubmit={handleSubmitFeedback}
      />

    </div>
  );
};

export default LunchBuddyApp;
