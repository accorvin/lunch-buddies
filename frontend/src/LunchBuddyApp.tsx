/// <reference types="vite/client" />

import React, { useState, useEffect } from 'react';
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
  Pagination
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
  BellIcon,
  ClockIcon,
  MoneyBillWaveIcon,
  LightbulbIcon,
  UserFriendsIcon,
  CogIcon,
  HelpIcon,
  GithubIcon
} from '@patternfly/react-icons';
import { BACKEND_URL } from './config';

// Define types inline since we're having issues with imports
interface MatchRound {
  date: string;
  matches: Array<{
    users: string[];
    commonDays: string[];
  }>;
}

interface Statistics {
  mostPopularDays: string[];
  registrationsByDay: Record<string, number>;
  totalRegistrations: number;
  recentRegistrations: number;
  averageDaysPerRegistration: number;
  lastUpdated: string;
}

interface Registration {
  userId: string;
  name: string;
  email: string;
  availableDays: string[];
}

interface Match {
  users: string[];
  commonDays: string[];
}

// Constants
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

interface Toast {
  key: number;
  title: string;
  variant: "success" | "danger";
}

interface Participant {
  name: string;
  email: string;
  availableDays: string[];
}

interface EditRegistrationFormProps {
  registration: Registration;
  onSave: (data: { name: string; email: string; availableDays: string[] }) => void;
  onCancel: () => void;
}

// Add a helper function to sort days
const sortDays = (days: string[]): string[] => {
  return days.sort((a, b) => weekdays.indexOf(a) - weekdays.indexOf(b));
};

const EditRegistrationForm: React.FC<EditRegistrationFormProps> = ({ registration, onSave, onCancel }) => {
  const [name, setName] = useState(registration.name);
  const [email, setEmail] = useState(registration.email);
  const [selectedDays, setSelectedDays] = useState<string[]>(sortDays([...registration.availableDays]));
  const [touched, setTouched] = useState({ name: false, email: false, days: false });

  const handleDayChange = (day: string) => {
    console.log('Day changed:', day);
    console.log('Current selected days:', selectedDays);
    setSelectedDays(prev => {
      const newDays = prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day];
      console.log('New days array:', newDays);
      return sortDays(newDays);
    });
    setTouched(prev => ({ ...prev, days: true }));
  };

  const handleSubmit = () => {
    console.log('Submitting form with days:', selectedDays);
    onSave({ name, email, availableDays: selectedDays });
  };

  return (
    <Form isHorizontal>
      <FormGroup
        label="Name"
        isRequired
        fieldId="name-input"
      >
        <TextInput
          id="name-input"
          value={name}
          onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
          onChange={(_evt, value) => setName(value)}
          placeholder="Jane Doe"
          validated={touched.name && !name ? "error" : "default"}
        />
        {touched.name && !name && (
          <div className="pf-v5-c-form__helper-text pf-m-error">Name is required</div>
        )}
      </FormGroup>

      <FormGroup
        label="Email"
        isRequired
        fieldId="email-input"
      >
        <TextInput
          id="email-input"
          value={email}
          onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
          onChange={(_evt, value) => setEmail(value)}
          placeholder="jane@example.com"
          validated={touched.email && (!email || !isValidEmail(email)) ? "error" : "default"}
        />
        {touched.email && (!email || !isValidEmail(email)) && (
          <div className="pf-v5-c-form__helper-text pf-m-error">Enter a valid email address</div>
        )}
      </FormGroup>

      <FormGroup
        label="Available Days"
        isRequired
        fieldId="available-days"
      >
        {weekdays.map((day) => (
          <Checkbox
            key={day}
            label={day}
            id={`day-${day}`}
            isChecked={selectedDays.includes(day)}
            onChange={() => handleDayChange(day)}
          />
        ))}
        {touched.days && selectedDays.length === 0 && (
          <div className="pf-v5-c-form__helper-text pf-m-error">Select at least one day</div>
        )}
      </FormGroup>

      <div className="mt-4">
        <PFButton
          variant="primary"
          onClick={handleSubmit}
          className="mr-2"
          isDisabled={!name || !email || !isValidEmail(email) || selectedDays.length === 0}
        >
          Update Registration
        </PFButton>
        <PFButton
          variant="secondary"
          onClick={onCancel}
        >
          Cancel Edit
        </PFButton>
      </div>
    </Form>
  );
};

interface NewRegistrationFormProps {
  onSave: (data: { name: string; email: string; availableDays: string[] }) => void;
  name: string;
  email: string;
  selectedDays: string[];
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
  onDayChange: (day: string) => void;
  touched: { name: boolean; email: boolean; days: boolean };
  onTouch: (field: 'name' | 'email' | 'days') => void;
}

const NewRegistrationForm: React.FC<NewRegistrationFormProps> = ({ 
  onSave, 
  name, 
  email, 
  selectedDays,
  onNameChange,
  onEmailChange,
  onDayChange,
  touched,
  onTouch
}) => {
  const handleSubmit = () => {
    onSave({ name, email, availableDays: selectedDays });
  };

  return (
    <Form isHorizontal>
      <FormGroup
        label="Name"
        isRequired
        fieldId="name-input"
      >
        <TextInput
          id="name-input"
          value={name}
          onBlur={() => onTouch('name')}
          onChange={(_evt, value) => onNameChange(value)}
          placeholder="Jane Doe"
          validated={touched.name && !name ? "error" : "default"}
        />
        {touched.name && !name && (
          <div className="pf-v5-c-form__helper-text pf-m-error">Name is required</div>
        )}
      </FormGroup>

      <FormGroup
        label="Email"
        isRequired
        fieldId="email-input"
      >
        <TextInput
          id="email-input"
          value={email}
          onBlur={() => onTouch('email')}
          onChange={(_evt, value) => onEmailChange(value)}
          placeholder="jane@example.com"
          validated={touched.email && (!email || !isValidEmail(email)) ? "error" : "default"}
        />
        {touched.email && (!email || !isValidEmail(email)) && (
          <div className="pf-v5-c-form__helper-text pf-m-error">Enter a valid email address</div>
        )}
      </FormGroup>

      <FormGroup
        label="Available Days"
        isRequired
        fieldId="available-days"
      >
        {weekdays.map((day) => (
          <Checkbox
            key={day}
            label={day}
            id={`day-${day}`}
            isChecked={selectedDays.includes(day)}
            onChange={() => onDayChange(day)}
          />
        ))}
        {touched.days && selectedDays.length === 0 && (
          <div className="pf-v5-c-form__helper-text pf-m-error">Select at least one day</div>
        )}
      </FormGroup>

      <div className="mt-4">
        <PFButton
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!name || !email || !isValidEmail(email) || selectedDays.length === 0}
        >
          Sign Up
        </PFButton>
      </div>
    </Form>
  );
};

const StatisticsView: React.FC = () => {
  const { getUserEmail } = useAuth();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          throw new Error('Not authenticated');
        }

        const response = await fetch(`${BACKEND_URL}/api/statistics`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-user-email': getUserEmail()
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch statistics');
        }
        
        const data = await response.json();
        setStatistics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [getUserEmail]);

  if (loading) {
    return <div>Loading statistics...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!statistics) {
    return null;
  }

  return (
    <div className="mt-6">
      <Title headingLevel="h2" size="xl" className="mb-4">Usage Statistics</Title>
      
      <Grid hasGutter>
        <GridItem span={6}>
          <PFCard>
            <CardTitle>Overview</CardTitle>
            <CardBody>
              <List isPlain>
                <ListItem>
                  <TextContent>
                    <Text component={TextVariants.p}>
                      Total Registrations: <strong>{statistics.totalRegistrations}</strong>
                    </Text>
                  </TextContent>
                </ListItem>
                <ListItem>
                  <TextContent>
                    <Text component={TextVariants.p}>
                      Recent Registrations (7 days): <strong>{statistics.recentRegistrations}</strong>
                    </Text>
                  </TextContent>
                </ListItem>
                <ListItem>
                  <TextContent>
                    <Text component={TextVariants.p}>
                      Average Days per Registration: <strong>{statistics.averageDaysPerRegistration}</strong>
                    </Text>
                  </TextContent>
                </ListItem>
              </List>
            </CardBody>
          </PFCard>
        </GridItem>
        
        <GridItem span={6}>
          <PFCard>
            <CardTitle>Most Popular Days</CardTitle>
            <CardBody>
              <List isPlain>
                {statistics.mostPopularDays.map((day: string, index: number) => (
                  <ListItem key={day}>
                    <TextContent>
                      <Text component={TextVariants.p}>
                        {index + 1}. {day} ({statistics.registrationsByDay[day]} registrations)
                      </Text>
                    </TextContent>
                  </ListItem>
                ))}
              </List>
            </CardBody>
          </PFCard>
        </GridItem>
        
        <GridItem span={12}>
          <PFCard>
            <CardTitle>Registrations by Day</CardTitle>
            <CardBody>
              <div className="grid grid-cols-5 gap-4">
                {weekdays.map(day => (
                  <div key={day} className="text-center">
                    <TextContent>
                      <Text component={TextVariants.h4}>{day}</Text>
                      <Text component={TextVariants.p}>
                        {statistics.registrationsByDay[day]} registrations
                      </Text>
                    </TextContent>
                  </div>
                ))}
              </div>
            </CardBody>
          </PFCard>
        </GridItem>
      </Grid>
      
      <div className="mt-4 text-sm text-gray-500">
        Last updated: {new Date(statistics.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

const ProgramInfoModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const nextMatchDate = new Date();
  nextMatchDate.setDate(nextMatchDate.getDate() + 21); // 3 weeks from now
  
  return (
    <Modal
      title={
        <div className="pf-v5-l-flex pf-m-space-items-sm pf-m-align-items-center">
          <UserFriendsIcon className="pf-v5-u-mr-sm" />
          <span>About the Lunch Buddy Program</span>
        </div>
      }
      isOpen={isOpen}
      onClose={onClose}
      variant="large"
    >
      <div className="pf-v5-l-flex pf-m-column pf-m-space-items-lg">
        <div>
          <div className="pf-v5-l-flex pf-m-space-items-sm pf-m-align-items-center pf-v5-u-mb-md">
            <CalendarAltIcon size={32} className="pf-v5-u-mb-md" />
            <Title headingLevel="h3" size="lg">
              Next Match Round
            </Title>
          </div>
          <Text component={TextVariants.p}>
            The next set of matches will be sent out on{' '}
            <strong>{nextMatchDate.toLocaleDateString()}</strong>.
            Matches are sent every 3 weeks to give everyone time to schedule their lunches.
          </Text>
        </div>
        
        <div>
          <div className="pf-v5-l-flex pf-m-space-items-sm pf-m-align-items-center pf-v5-u-mb-md">
            <UsersIcon className="pf-v5-u-mr-sm" />
            <Title headingLevel="h3" size="lg">
              How Matching Works
            </Title>
          </div>
          <List isPlain>
            <ListItem>🎯 Participants are matched based on their available days</ListItem>
            <ListItem>🔄 The system tries to match people who haven't been paired together in the last 3 rounds</ListItem>
            <ListItem>🤝 Matches are made to maximize the number of common available days</ListItem>
            <ListItem>📱 You'll receive a Slack DM with your match's information</ListItem>
            <ListItem>📅 You can update your available days at any time</ListItem>
          </List>
        </div>
        
        <div>
          <div className="pf-v5-l-flex pf-m-space-items-sm pf-m-align-items-center pf-v5-u-mb-md">
            <ClockIcon className="pf-v5-u-mr-sm" />
            <Title headingLevel="h3" size="lg">
              Getting Started
            </Title>
          </div>
          <List isPlain>
            <ListItem>📝 Sign up with your name, email, and available days</ListItem>
            <ListItem>⏳ Wait for the next matching round</ListItem>
            <ListItem>📬 Check your Slack DMs for your match</ListItem>
            <ListItem>🍽️ Coordinate with your match to schedule lunch</ListItem>
            <ListItem>🔄 Update your registration if your availability changes</ListItem>
          </List>
        </div>
        
        <div>
          <div className="pf-v5-l-flex pf-m-space-items-sm pf-m-align-items-center pf-v5-u-mb-md">
            <MoneyBillWaveIcon className="pf-v5-u-mr-sm" />
            <Title headingLevel="h3" size="lg">
              Lunch Expenses
            </Title>
          </div>
          <List isPlain>
            <ListItem>💰 Red Hat will cover the cost of lunch for all participants</ListItem>
            <ListItem>📧 Please reach out to Alex Corvin (acorvin@redhat.com) for information about how to expense your lunch</ListItem>
            <ListItem>🧾 Keep your receipts for expense reporting</ListItem>
          </List>
        </div>
        
        <div>
          <div className="pf-v5-l-flex pf-m-space-items-sm pf-m-align-items-center pf-v5-u-mb-md">
            <LightbulbIcon className="pf-v5-u-mr-sm" />
            <Title headingLevel="h3" size="lg">
              Tips for Success
            </Title>
          </div>
          <List isPlain>
            <ListItem>📅 Keep your available days up to date</ListItem>
            <ListItem>⚡ Respond promptly to your match's messages</ListItem>
            <ListItem>🤝 Be flexible with scheduling</ListItem>
            <ListItem>📢 If you can't make it, let your match know as soon as possible</ListItem>
          </List>
        </div>
      </div>
    </Modal>
  );
};

const CountdownTile: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const nextMatchDate = new Date();
      nextMatchDate.setDate(nextMatchDate.getDate() + 21); // 3 weeks from now
      
      const now = new Date();
      const difference = nextMatchDate.getTime() - now.getTime();
      
      if (difference <= 0) {
        return 'Matches are being sent out today!';
      }
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return `${days} days, ${hours} hours`;
    };
    
    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000 * 60); // Update every minute
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <PFCard className="pf-v5-u-h-100">
      <CardBody>
        <div className="pf-v5-l-flex pf-m-column pf-m-space-items-md">
          <div className="pf-v5-l-flex__item">
            <CalendarAltIcon size={32} className="pf-v5-u-mb-md" />
          </div>
          <div className="pf-v5-l-flex__item">
            <Title headingLevel="h3" size="lg">Next Match Round</Title>
          </div>
          <div className="pf-v5-l-flex__item">
            <Text component={TextVariants.h1} className="pf-v5-u-font-size-2xl">
              {timeLeft}
            </Text>
          </div>
          <div className="pf-v5-l-flex__item">
            <Text component={TextVariants.small}>
              Matches are sent every 3 weeks
            </Text>
          </div>
        </div>
      </CardBody>
    </PFCard>
  );
};

const LunchBuddyApp = () => {
  const { user, loading, login, logout, getUserEmail } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [touched, setTouched] = useState({ name: false, email: false, days: false });
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [matchedPairs, setMatchedPairs] = useState<Match[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [myRegistration, setMyRegistration] = useState<Registration | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const isDevelopment = import.meta.env.DEV;
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMatchHistoryModalOpen, setIsMatchHistoryModalOpen] = useState(false);
  const [matchHistory, setMatchHistory] = useState<MatchRound[]>([]);
  const [showMatchHistory, setShowMatchHistory] = useState(false);
  const [isProgramInfoModalOpen, setIsProgramInfoModalOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  
  const showToast = (title: string, variant: "success" | "danger") => {
    const key = new Date().getTime();
    setToasts((prev) => [...prev, { key, title, variant }]);
  };

  const handleEditClick = () => {
    if (myRegistration) {
      setName(myRegistration.name || '');
      setEmail(myRegistration.email || '');
      setSelectedDays([...myRegistration.availableDays]);
      setTouched({ name: false, email: false, days: false });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleDayChange = (day: string, index: number): void => {
    console.log('Day being changed:', day);
    console.log('Current selected days:', selectedDays);
    const isSelected = selectedDays.includes(day);
    console.log('Is day currently selected?', isSelected);
    
    const newDays = isSelected
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    
    console.log('New days array:', newDays);
    setSelectedDays(sortDays(newDays));
  };

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Add debug logging for admin status
  useEffect(() => {
    if (user) {
      console.log('User logged in:', user);
      const userEmail = getUserEmail();
      console.log('Checking admin status for email:', userEmail);
      
      // Check admin status
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found for admin check');
        return;
      }
      fetch(`${BACKEND_URL}/api/is-admin`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-email': userEmail
        }
      })
        .then(res => {
          console.log('Admin check response status:', res.status);
          return res.json();
        })
        .then(data => {
          console.log('Admin check response data:', data);
          setIsAdmin(data.isAdmin);
        })
        .catch(err => {
          console.error('Failed to check admin status:', err);
          // Force admin access in case of error
          console.log('Error occurred, forcing admin access');
          setIsAdmin(true);
        });
    } else {
      console.log('No user logged in');
      setIsAdmin(false);
    }
  }, [user, getUserEmail]);

  const loadRegistration = async () => {
    if (!user) {
      console.log('No user logged in, clearing registration');
      setMyRegistration(null);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      console.log('Loading registration for user:', user.id);
      const res = await fetch(`${BACKEND_URL}/api/my-registration`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Registration response status:', res.status);
      const responseText = await res.text();
      console.log('Registration response:', responseText);

      if (res.ok) {
        const data = JSON.parse(responseText);
        console.log('Parsed registration data:', data);
        setMyRegistration(data);
        if (data) {
          setName(data.name);
          setEmail(data.email);
          setSelectedDays([...data.availableDays]);
        }
      } else {
        console.error('Failed to load registration:', responseText);
        setMyRegistration(null);
      }
    } catch (err) {
      console.error("Failed to load registration:", err);
      setMyRegistration(null);
    }
  };

  // Load registration when user changes
  useEffect(() => {
    console.log('User changed, loading registration');
    loadRegistration();
  }, [user]);

  const handleSubmit = async () => {
    if (!user) {
      showToast("Please login first", "danger");
      return;
    }

    if (!name || !email || !isValidEmail(email) || selectedDays.length === 0) {
      showToast("Please fill all required fields correctly.", "danger");
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showToast("Please login again", "danger");
        logout();
        return;
      }

      const endpoint = isEditing ? "/api/registration" : "/api/register";
      const method = isEditing ? "PUT" : "POST";
      
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-user-email": getUserEmail()
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, availableDays: selectedDays })
      });

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (err) {
        console.error("Failed to parse response:", err);
        throw new Error(`Invalid response from server: ${text}`);
      }

      if (res.status === 400) {
        showToast(data?.errors?.join(", ") || "Invalid input. Please check your entries.", "danger");
      } else if (res.status === 401) {
        showToast("Please login again to continue.", "danger");
        logout();
      } else if (!res.ok) {
        console.error("Server error:", data);
        showToast(data?.error || "Failed to process registration. Please try again.", "danger");
      } else {
        if (!data || !data.id || !data.userId) {
          console.error("Invalid registration data:", data);
          throw new Error("Invalid registration data received from server");
        }

        const newRegistration = {
          ...data,
          availableDays: Array.isArray(data.availableDays) ? data.availableDays : []
        };
        
        setMyRegistration(newRegistration);
        setName(newRegistration.name);
        setEmail(newRegistration.email);
        setSelectedDays(newRegistration.availableDays);
        setTouched({ name: false, email: false, days: false });
        setIsEditing(false);

        // Refresh participants list
        const participantsRes = await fetch(`${BACKEND_URL}/api/participants`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (participantsRes.ok) {
          const updatedParticipants = await participantsRes.json();
          setParticipants(updatedParticipants);
        }

        showToast(
          isEditing ? "Registration updated successfully!" : "Successfully registered!",
          "success"
        );
      }
    } catch (err: unknown) {
      console.error("Registration error:", err);
      if (err instanceof TypeError && err.message.includes("Network error")) {
        showToast("Failed to connect to the server. Please check your connection and try again.", "danger");
      } else if (err instanceof Error) {
        showToast(err.message || "An unexpected error occurred. Please try again.", "danger");
      } else {
        showToast("An unexpected error occurred. Please try again.", "danger");
      }
    }
  };

  const handleCancelRegistration = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found for cancel registration');
        showToast('Please login again', 'danger');
        return;
      }
      const res = await fetch(`${BACKEND_URL}/api/registration`, {
        method: "DELETE",
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setMyRegistration(null);
        // Reinitialize form with user data
        if (user) {
          setName(user.name || '');
          setEmail(user.email || '');
        }
        setSelectedDays([]);
        setTouched({ name: false, email: false, days: false });
        
        // Refresh participants list
        const participantsRes = await fetch(`${BACKEND_URL}/api/participants`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (participantsRes.ok) {
          const updatedParticipants = await participantsRes.json();
          setParticipants(updatedParticipants);
        }
        
        showToast("Registration cancelled successfully", "success");
      } else {
        const data = await res.json();
        showToast(data?.error || "Failed to cancel registration", "danger");
      }
    } catch (err) {
      console.error("Cancel registration error:", err);
      showToast("Failed to cancel registration. Please try again.", "danger");
    }
  };

  const handleMatch = async () => {
    try {
      console.log('Starting match process...');
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${BACKEND_URL}/api/match`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-email': getUserEmail()
        }
      });

      console.log('Match response status:', response.status);
      const responseText = await response.text();
      console.log('Match response text:', responseText);

      if (!response.ok) {
        const error = JSON.parse(responseText);
        throw new Error(error.error || 'Failed to match participants');
      }

      const matches = JSON.parse(responseText) as Match[];
      console.log('Parsed matches:', matches);
      
      setMatchedPairs(matches);
      
      const isDevelopment = window.location.hostname === 'localhost';
      showToast(
        isDevelopment 
          ? 'Test matches generated successfully! Check server logs for details.'
          : 'Participants matched successfully! Slack DMs have been sent.',
        'success'
      );
    } catch (error) {
      console.error('Error matching participants:', error);
      showToast(error instanceof Error ? error.message : 'Failed to match participants', 'danger');
    }
  };

  const handleOpenParticipantsModal = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${BACKEND_URL}/api/participants`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setParticipants(data);
        setIsParticipantsModalOpen(true);
      } else {
        const error = await res.json();
        showToast(error.message || "Failed to load participants", "danger");
      }
    } catch (err) {
      console.error("Failed to load participants:", err);
      showToast("Failed to load participants. Please try again.", "danger");
    }
  };

  const handleSaveEdit = async (data: { name: string; email: string; availableDays: string[] }) => {
    if (!myRegistration) return;
    
    try {
      console.log('Sending update request with data:', data);
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${BACKEND_URL}/api/registration`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-email': getUserEmail()
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      console.log('Update response status:', response.status);
      const responseText = await response.text();
      console.log('Update response text:', responseText);

      if (!response.ok) {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.error || 'Failed to update registration');
      }

      const updatedRegistration = JSON.parse(responseText);
      console.log('Updated registration:', updatedRegistration);

      setMyRegistration(updatedRegistration);
      setName(updatedRegistration.name);
      setEmail(updatedRegistration.email);
      setSelectedDays(updatedRegistration.availableDays);
      setIsEditing(false);

      // Refresh participants list
      const participantsRes = await fetch(`${BACKEND_URL}/api/participants`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (participantsRes.ok) {
        const updatedParticipants = await participantsRes.json();
        setParticipants(updatedParticipants);
      }

      showToast('Registration updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating registration:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update registration', 'danger');
    }
  };

  const handleSaveNew = async () => {
    if (!user) {
      showToast("Please login first", "danger");
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found for new registration');
        showToast('Please login again', 'danger');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-email': getUserEmail()
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          email: getUserEmail(),
          availableDays: selectedDays,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create registration');
      }

      const newRegistration = await response.json();
      setMyRegistration(newRegistration);
      setIsEditing(false);

      // Refresh participants list
      const participantsRes = await fetch(`${BACKEND_URL}/api/participants`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (participantsRes.ok) {
        const updatedParticipants = await participantsRes.json();
        setParticipants(updatedParticipants);
      }

      showToast('Registration created successfully!', 'success');
    } catch (error) {
      console.error('Error creating registration:', error);
      showToast(error instanceof Error ? error.message : 'Failed to create registration', 'danger');
    }
  };

  const handleGenerateTestData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found for test data generation');
        showToast('Please login again', 'danger');
        return;
      }
      const response = await fetch(`${BACKEND_URL}/api/generate-test-data`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-email': getUserEmail()
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate test data');
      }

      const data = await response.json();
      showToast('Test data generated successfully!', 'success');
      console.log('Generated test registrations:', data.registrations);
    } catch (error) {
      console.error('Error generating test data:', error);
      showToast(error instanceof Error ? error.message : 'Failed to generate test data', 'danger');
    }
  };

  const handleViewMatchHistory = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found for match history');
        showToast('Please login again', 'danger');
        return;
      }

      console.log('Fetching match history with token');
      const response = await fetch(`${BACKEND_URL}/api/match-history`, {
        credentials: "include",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Match history response status:', response.status);
      const responseText = await response.text();
      console.log('Match history response:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = JSON.parse(responseText);
      console.log('Parsed match history data:', data);
      
      if (!Array.isArray(data)) {
        console.error("❌ Invalid match history data format");
        return;
      }
      
      // Fetch registrations to get user details
      const registrationsResponse = await fetch(`${BACKEND_URL}/api/participants`, {
        credentials: "include",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Registrations response status:', registrationsResponse.status);
      const registrationsText = await registrationsResponse.text();
      console.log('Registrations response:', registrationsText);
      
      if (!registrationsResponse.ok) {
        throw new Error(`HTTP error! status: ${registrationsResponse.status}`);
      }
      
      const registrationsData = JSON.parse(registrationsText);
      
      setRegistrations(registrationsData);
      setMatchHistory(data);
      setShowMatchHistory(true);
    } catch (error) {
      console.error("❌ Error fetching match history:", error);
      showToast(error instanceof Error ? error.message : 'Failed to fetch match history', 'danger');
    }
  };

  useEffect(() => {
    if (user) {
      loadRegistration();
    }
  }, [user]);

  // Add useEffect to handle day selection changes
  useEffect(() => {
    if (isEditing && myRegistration) {
      // Update touched state when days change
      setTouched(prev => ({
        ...prev,
        days: JSON.stringify(selectedDays) !== JSON.stringify(myRegistration.availableDays)
      }));
    }
  }, [selectedDays, isEditing, myRegistration]);

  const fetchStatistics = async () => {
    if (!user) {
      console.log('No user logged in, skipping statistics fetch');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found for statistics');
        showToast('Please login again', 'danger');
        return;
      }

      console.log('Fetching statistics with token');
      const response = await fetch(`${BACKEND_URL}/api/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-email': getUserEmail()
        },
        credentials: 'include'
      });

      console.log('Statistics response status:', response.status);
      const responseText = await response.text();
      console.log('Statistics response:', responseText);

      if (!response.ok) {
        if (response.status === 401) {
          showToast('Please login again', 'danger');
          logout();
        } else {
          throw new Error(`Failed to fetch statistics: ${responseText}`);
        }
        return;
      }

      const data = JSON.parse(responseText);
      console.log('Parsed statistics data:', data);
      setStatistics(data);
    } catch (err) {
      console.error("Error fetching statistics:", err);
      setError(err instanceof Error ? err.message : "Failed to load statistics");
      showToast('Failed to load statistics', 'danger');
    }
  };

  // Load statistics when user changes
  useEffect(() => {
    if (user) {
      console.log('User logged in, fetching statistics');
      fetchStatistics();
    } else {
      console.log('No user, clearing statistics');
      setStatistics(null);
    }
  }, [user]);

  useEffect(() => {
    const loadParticipants = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.error('No auth token found for participants');
          return;
        }
        const res = await fetch(`${BACKEND_URL}/api/participants`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setParticipants(data);
        }
      } catch (err) {
        console.error("Failed to load participants:", err);
        showToast("Failed to load participants. Please try again.", "danger");
      }
    };

    if (user) {
      loadParticipants();
    }
  }, [user]);

  const handleGoogleLogin = () => {
    console.log('Initiating Google login...');
    login(); // Use the auth context login method
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="pf-v5-c-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="pf-v5-c-page__header">
        <div className="pf-v5-c-page__header-brand">
          <div className="pf-v5-c-page__header-brand-toggle">
            <img 
              src="/redhat-logo.png" 
              alt="Red Hat" 
              style={{ height: '40px', width: 'auto' }}
            />
          </div>
          <div className="pf-v5-c-page__header-brand-link">
            <Title headingLevel="h1" size="2xl">Red Hat AI | Raleigh Lunch Buddy Program</Title>
          </div>
        </div>
        <div className="pf-v5-c-page__header-tools">
          {user ? (
            <div className="pf-v5-c-page__header-tools-group">
              <div className="pf-v5-c-page__header-tools-item">
                <a 
                  href="https://github.com/accorvin/lunch-buddies" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="pf-v5-c-button pf-m-plain"
                  aria-label="View source code on GitHub"
                >
                  <GithubIcon />
                </a>
              </div>
              {isAdmin && (
                <div className="pf-v5-c-page__header-tools-item">
                  <PFButton 
                    variant="plain"
                    aria-label="Admin settings"
                    onClick={() => setIsAdminModalOpen(true)}
                    icon={<CogIcon />}
                  />
                </div>
              )}
              <div className="pf-v5-c-page__header-tools-item">
                <Dropdown
                  isOpen={isUserDropdownOpen}
                  onSelect={() => setIsUserDropdownOpen(false)}
                  toggle={(toggleRef: React.RefObject<MenuToggleElement>) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                      isExpanded={isUserDropdownOpen}
                      className="pf-v5-u-color-100"
                      style={{
                        padding: '6px 12px',
                        border: '1px solid currentColor',
                        borderRadius: '3px',
                        backgroundColor: 'transparent'
                      }}
                    >
                      <span className="pf-v5-l-flex pf-m-space-items-sm pf-m-align-items-center">
                        <Avatar 
                          src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} 
                          alt={user.name}
                          size="sm"
                        />
                        <span>{user.name}</span>
                      </span>
                    </MenuToggle>
                  )}
                >
                  <div className="pf-v5-c-dropdown__group">
                    <div className="pf-v5-c-dropdown__menu-item pf-m-disabled">
                      <Text component={TextVariants.p}>
                        <strong>Name:</strong> {user.name}
                      </Text>
                    </div>
                    <div className="pf-v5-c-dropdown__menu-item pf-m-disabled">
                      <Text component={TextVariants.p}>
                        <strong>Email:</strong> {user.email}
                      </Text>
                    </div>
                    <div className="pf-v5-c-dropdown__menu-item pf-m-disabled">
                      <Text component={TextVariants.p}>
                        <strong>Admin:</strong> {isAdmin ? 'Yes' : 'No'}
                      </Text>
                    </div>
                  </div>
                  <Divider />
                  <DropdownItem key="logout" onClick={logout}>
                    Log out
                  </DropdownItem>
                </Dropdown>
              </div>
            </div>
          ) : (
            <div className="pf-v5-c-page__header-tools-item">
              <PFButton variant="primary" onClick={handleGoogleLogin}>
                Login with Google
              </PFButton>
            </div>
          )}
        </div>
      </header>

      <div className="pf-v5-c-page__main" style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
        <div className="pf-v5-c-page__main-section" style={{ flex: '1 1 auto' }}>
          <AlertGroup isToast isLiveRegion>
            {toasts.map(({ key, title, variant }) => (
              <Alert
                key={key}
                variant={variant}
                title={title}
                timeout={5000}
                actionClose={
                  <AlertActionCloseButton
                    onClose={() =>
                      setToasts((prev) => prev.filter((t) => t.key !== key))
                    }
                  />
                }
              />
            ))}
          </AlertGroup>

          <div className="pf-v5-l-grid pf-m-gutter">
            <div className="pf-v5-l-grid__item pf-m-12-col">
              <PFCard className="pf-v5-u-mb-lg">
                <CardBody>
                  <div className="pf-v5-l-flex pf-m-column pf-m-row-on-md pf-m-space-items-md pf-m-align-items-center pf-m-justify-content-space-between">
                    <div className="pf-v5-l-flex__item">
                      <Title headingLevel="h2" size="xl" className="pf-v5-u-mb-md">
                        Welcome to the Lunch Buddy Program
                      </Title>
                      <Text component={TextVariants.p}>
                        Sign up to get matched for lunch with another member of the Red Hat AI team!
                      </Text>
                    </div>
                    <div className="pf-v5-l-flex__item">
                      <PFButton
                        variant="plain"
                        onClick={() => setIsProgramInfoModalOpen(true)}
                        className="pf-v5-u-color-100 pf-v5-c-button--bordered"
                        style={{
                          border: '1px solid currentColor',
                          borderRadius: '3px',
                          padding: '6px 12px'
                        }}
                      >
                        <span className="pf-v5-l-flex pf-m-space-items-sm pf-m-align-items-center">
                          <HelpIcon />
                          <span>About the Program</span>
                        </span>
                      </PFButton>
                    </div>
                  </div>
                </CardBody>
              </PFCard>
            </div>

            {user ? (
              <>
                <div className="pf-v5-l-grid__item pf-m-12-col">
                  <PFCard className="pf-v5-u-mb-lg">
                    <CardBody>
                      <div className="pf-v5-l-flex pf-m-column pf-m-row-on-md pf-m-space-items-md pf-m-align-items-center">
                        <div className="pf-v5-l-flex__item">
                          <Title headingLevel="h2" size="xl">
                            Lunch Buddy Program
                          </Title>
                        </div>
                      </div>
                      
                      <div className="pf-v5-l-grid pf-m-gutter">
                        <div className="pf-v5-l-grid__item pf-m-4-col">
                          <CountdownTile />
                        </div>
                        
                        <div className="pf-v5-l-grid__item pf-m-8-col">
                          <PFCard className="pf-v5-u-h-100">
                            <CardBody>
                              {myRegistration && !isEditing && (
                                <div className="pf-v5-u-mb-lg">
                                  <Title headingLevel="h3" size="lg" className="pf-v5-u-mb-md">
                                    Your Current Registration
                                  </Title>
                                  <div className="pf-v5-l-flex pf-m-column">
                                    <div className="pf-v5-l-flex__item">
                                      <Text component={TextVariants.p}>
                                        <strong>Name:</strong> {myRegistration.name}
                                      </Text>
                                    </div>
                                    <div className="pf-v5-l-flex__item">
                                      <Text component={TextVariants.p}>
                                        <strong>Email:</strong> {myRegistration.email}
                                      </Text>
                                    </div>
                                    <div className="pf-v5-l-flex__item">
                                      <Text component={TextVariants.p}>
                                        <strong>Available Days:</strong> {sortDays([...myRegistration.availableDays]).join(", ")}
                                      </Text>
                                    </div>
                                    <div className="pf-v5-l-flex__item pf-v5-u-mt-md">
                                      <div className="pf-v5-l-flex pf-m-space-items-sm">
                                        <div className="pf-v5-l-flex__item">
                                          <PFButton
                                            variant="secondary"
                                            onClick={handleEditClick}
                                          >
                                            Edit Registration
                                          </PFButton>
                                        </div>
                                        <div className="pf-v5-l-flex__item">
                                          <PFButton
                                            variant="danger"
                                            onClick={handleCancelRegistration}
                                          >
                                            Cancel Registration
                                          </PFButton>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {!myRegistration && !isEditing && (
                                <div>
                                  <Title headingLevel="h3" size="lg" className="pf-v5-u-mb-lg">
                                    New Registration
                                  </Title>
                                  <Form isHorizontal>
                                    <FormGroup
                                      label="Name"
                                      isRequired
                                      fieldId="name-input"
                                    >
                                      <TextInput
                                        id="name-input"
                                        value={name}
                                        onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                                        onChange={(_evt, value) => setName(value)}
                                        placeholder="Jane Doe"
                                        validated={touched.name && !name ? "error" : "default"}
                                      />
                                      {touched.name && !name && (
                                        <div className="pf-v5-c-form__helper-text pf-m-error">Name is required</div>
                                      )}
                                    </FormGroup>

                                    <FormGroup
                                      label="Email"
                                      isRequired
                                      fieldId="email-input"
                                    >
                                      <TextInput
                                        id="email-input"
                                        value={email}
                                        onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                                        onChange={(_evt, value) => setEmail(value)}
                                        placeholder="jane@example.com"
                                        validated={touched.email && (!email || !isValidEmail(email)) ? "error" : "default"}
                                      />
                                      {touched.email && (!email || !isValidEmail(email)) && (
                                        <div className="pf-v5-c-form__helper-text pf-m-error">Enter a valid email address</div>
                                      )}
                                    </FormGroup>

                                    <FormGroup
                                      label="Available Days"
                                      isRequired
                                      fieldId="available-days"
                                    >
                                      <div className="pf-v5-l-grid pf-m-gutter">
                                        {weekdays.map((day) => (
                                          <div key={day} className="pf-v5-l-grid__item pf-m-2-col">
                                            <Checkbox
                                              label={day}
                                              id={`day-${day}`}
                                              isChecked={selectedDays.includes(day)}
                                              onChange={() => handleDayChange(day, 0)}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                      {touched.days && selectedDays.length === 0 && (
                                        <div className="pf-v5-c-form__helper-text pf-m-error">Select at least one day</div>
                                      )}
                                    </FormGroup>

                                    <div className="pf-v5-u-mt-lg">
                                      <PFButton
                                        variant="primary"
                                        onClick={handleSaveNew}
                                        isDisabled={!name || !email || !isValidEmail(email) || selectedDays.length === 0}
                                      >
                                        Sign Up
                                      </PFButton>
                                    </div>
                                  </Form>
                                </div>
                              )}

                              {isEditing && myRegistration && (
                                <EditRegistrationForm
                                  registration={myRegistration}
                                  onSave={handleSaveEdit}
                                  onCancel={handleCancelEdit}
                                />
                              )}
                            </CardBody>
                          </PFCard>
                        </div>

                        <div className="pf-v5-l-grid__item pf-m-12-col">
                          <PFCard className="pf-v5-u-mb-lg">
                            <CardBody>
                              <Title headingLevel="h2" size="xl" className="pf-v5-u-mb-lg">
                                Current Participants
                              </Title>
                              <Table aria-label="Participants Table" variant={TableVariant.compact}>
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Available Days</Th>
                </Tr>
              </Thead>
              <Tbody>
                                  {participants
                                    .slice((page - 1) * perPage, page * perPage)
                                    .map((participant, idx) => (
                                      <Tr key={idx}>
                    <Td>{participant.name}</Td>
                    <Td>{participant.email}</Td>
                                        <Td>{participant.availableDays?.join(", ") || "—"}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
                              <div className="pf-v5-u-mt-md">
                                <Pagination
                                  itemCount={participants.length}
                                  perPage={perPage}
                                  page={page}
                                  onSetPage={(_evt, newPage) => setPage(newPage)}
                                  onPerPageSelect={(_evt, newPerPage) => {
                                    setPerPage(newPerPage);
                                    setPage(1);
                                  }}
                                  variant="bottom"
                                  isCompact
                                />
                              </div>
                            </CardBody>
                          </PFCard>
                        </div>
                      </div>
                    </CardBody>
                  </PFCard>
                </div>
              </>
            ) : (
              <div className="pf-v5-l-grid__item pf-m-12-col">
                <PFCard className="pf-v5-u-mb-lg">
                  <CardBody>
                    <div className="pf-v5-u-text-align-center">
                      <Title headingLevel="h2" size="xl" className="pf-v5-u-mb-md">
                        Please Login to Continue
                      </Title>
                      <Text component={TextVariants.p} className="pf-v5-u-mb-lg">
                        Sign in with your Google account to participate in the Lunch Buddy program
                      </Text>
                      <PFButton variant="primary" onClick={handleGoogleLogin}>
                        Login with Google
                      </PFButton>
                    </div>
                  </CardBody>
                </PFCard>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        variant="large"
        title="Admin Dashboard"
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      >
        <div className="pf-v5-l-grid pf-m-gutter">
          <div className="pf-v5-l-grid__item pf-m-12-col">
            <PFCard>
              <CardTitle>Match Management</CardTitle>
              <CardBody>
                <div className="pf-v5-l-flex pf-m-column pf-m-space-items-md">
                  <PFButton
                    variant="primary"
                    onClick={handleMatch}
                  >
                    Generate Matches
                  </PFButton>
                  <PFButton
                    variant="secondary"
                    onClick={handleViewMatchHistory}
                  >
                    View Match History
                  </PFButton>
                </div>
              </CardBody>
            </PFCard>
          </div>

          {isDevelopment && (
            <div className="pf-v5-l-grid__item pf-m-12-col">
              <PFCard>
                <CardTitle>Development Tools</CardTitle>
                <CardBody>
                  <div className="pf-v5-l-flex pf-m-column pf-m-space-items-md">
                    <PFButton
                      variant="secondary"
                      onClick={handleGenerateTestData}
                    >
                      Generate Test Data
                    </PFButton>
                  </div>
                </CardBody>
              </PFCard>
            </div>
          )}

          <div className="pf-v5-l-grid__item pf-m-12-col">
            <PFCard>
              <CardTitle>Statistics</CardTitle>
              <CardBody>
                <StatisticsView />
              </CardBody>
            </PFCard>
          </div>
        </div>
          </Modal>

      <Modal
        variant="large"
        title="Match History"
        isOpen={showMatchHistory}
        onClose={() => setShowMatchHistory(false)}
      >
        <div className="pf-v5-l-stack pf-m-gutter">
          {matchHistory.length === 0 ? (
            <Text component={TextVariants.p}>No match history available.</Text>
          ) : (
            matchHistory.map((round, roundIndex) => (
              <div key={roundIndex} className="pf-v5-c-card">
                <div className="pf-v5-c-card__title">
                  Round {matchHistory.length - roundIndex} - {new Date(round.date).toLocaleDateString()}
                </div>
                <div className="pf-v5-c-card__body">
                  <Table aria-label={`Match round ${matchHistory.length - roundIndex}`} variant={TableVariant.compact}>
                    <Thead>
                      <Tr>
                        <Th>Participants</Th>
                        <Th>Common Available Days</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {round.matches.map((match: { users: string[]; commonDays: string[] }, matchIndex: number) => {
                        const person1 = registrations.find(r => r.userId === match.users[0]);
                        const person2 = registrations.find(r => r.userId === match.users[1]);
                        
                        if (!person1 || !person2) {
                          console.warn(`Missing registration data for match ${matchIndex} in round ${roundIndex}`);
                          return null;
                        }
                        
                        return (
                          <Tr key={matchIndex}>
                            <Td>
                              <div className="pf-v5-l-stack pf-m-gutter-sm">
                                <div className="pf-v5-l-stack__item">
                                  <strong>{person1.name}</strong> & <strong>{person2.name}</strong>
                                </div>
                                <div className="pf-v5-l-stack__item pf-v5-u-color-200">
                                  {person1.email} & {person2.email}
                                </div>
                              </div>
                            </Td>
                            <Td>{match.commonDays.join(", ")}</Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      <ProgramInfoModal
        isOpen={isProgramInfoModalOpen}
        onClose={() => setIsProgramInfoModalOpen(false)}
      />
    </div>
  );
};

export default LunchBuddyApp;
