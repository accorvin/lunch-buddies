import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Form, 
  FormGroup, 
  Button, 
  DatePicker,
  Alert,
  TextContent,
  Text
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';

interface NextMatchDatePickerProps {
  initialDate: Date | null;
  onSave: (date: Date) => void;
  onCancel: () => void;
}

export const NextMatchDatePicker: React.FC<NextMatchDatePickerProps> = ({
  initialDate,
  onSave,
  onCancel,
}) => {
  const [editing, setEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDate) {
      // Convert the initial date to local time for display
      const localDate = new Date(initialDate);
      setSelectedDate(localDate);
    }
  }, [initialDate]);

  const handleDateChange = (_event: React.FormEvent<HTMLInputElement>, value: string, date?: Date) => {
    if (date) {
      setSelectedDate(date);
      setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    // Create a UTC date at noon to match backend
    const utcDate = new Date(Date.UTC(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      12, // noon
      0,
      0
    ));

    // Validate that the date is in the future
    const now = new Date();
    if (utcDate <= now) {
      setError('Match date must be in the future');
      return;
    }

    onSave(utcDate);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="pf-v5-u-display-flex pf-v5-u-align-items-center">
        <TextContent>
          <Text component="p">
            Next Match Date: {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Not set'}
          </Text>
        </TextContent>
        <Button
          variant="plain"
          onClick={() => setEditing(true)}
          icon={<PencilAltIcon />}
          aria-label="Edit next match date"
        />
      </div>
    );
  }

  return (
    <Form onSubmit={handleSubmit} data-testid="next-match-date-form">
      <FormGroup
        label="Next Match Date"
        isRequired
        fieldId="next-match-date"
      >
        <DatePicker
          value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
          onChange={handleDateChange}
          aria-label="Select next match date"
        />
        {error && (
          <Alert
            variant="danger"
            isInline
            title={error}
            className="pf-v5-u-mt-sm"
          />
        )}
      </FormGroup>
      <div className="pf-v5-u-display-flex pf-v5-u-mt-md">
        <Button
          variant="primary"
          type="submit"
          isDisabled={!selectedDate}
        >
          Save
        </Button>
        <Button
          variant="link"
          onClick={() => {
            setEditing(false);
            setError(null);
            onCancel();
          }}
          className="pf-v5-u-ml-sm"
        >
          Cancel
        </Button>
      </div>
    </Form>
  );
};

export default NextMatchDatePicker; 