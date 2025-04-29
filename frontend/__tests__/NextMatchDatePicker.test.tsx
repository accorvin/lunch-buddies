import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NextMatchDatePicker from '../src/components/NextMatchDatePicker';

describe('NextMatchDatePicker', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the date picker form', () => {
    render(<NextMatchDatePicker initialDate={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
    
    expect(screen.getByText('Next Match Date: Not set')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit next match date')).toBeInTheDocument();
  });

  it('shows error when trying to save without selecting a date', async () => {
    render(<NextMatchDatePicker initialDate={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
    
    // Click edit button first and wait for form to render
    fireEvent.click(screen.getByLabelText('Edit next match date'));
    await screen.findByLabelText('Select next match date');
    
    // Submit the form
    const form = screen.getByTestId('next-match-date-form');
    fireEvent.submit(form);
    
    // Wait for the error state to be set and the Alert to appear
    await waitFor(() => {
      const alert = screen.getByText('Please select a date');
      expect(alert).toBeInTheDocument();
    });
    
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('shows error when selecting a past date', async () => {
    render(<NextMatchDatePicker initialDate={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
    
    // Click edit button first
    fireEvent.click(screen.getByLabelText('Edit next match date'));
    
    const dateInput = screen.getByLabelText('Select next match date');
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    fireEvent.change(dateInput, { target: { value: pastDate.toISOString().split('T')[0] } });
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      const alert = screen.getByText('Match date must be in the future');
      expect(alert).toBeInTheDocument();
    });
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('calls onSave with the selected date when valid', async () => {
    render(<NextMatchDatePicker initialDate={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
    
    // Click edit button first
    fireEvent.click(screen.getByLabelText('Edit next match date'));
    
    const dateInput = screen.getByLabelText('Select next match date');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    futureDate.setHours(0, 0, 0, 0);
    const dateString = futureDate.toISOString().split('T')[0];
    fireEvent.change(dateInput, { target: { value: dateString } });
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
      const calledDate = mockOnSave.mock.calls[0][0];
      // Compare only the date part using the date string
      expect(calledDate.toISOString().split('T')[0]).toBe(dateString);
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<NextMatchDatePicker initialDate={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
    
    // Click edit button first
    fireEvent.click(screen.getByLabelText('Edit next match date'));
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables save button when no date is selected', () => {
    render(<NextMatchDatePicker initialDate={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
    
    // Click edit button first
    fireEvent.click(screen.getByLabelText('Edit next match date'));
    
    // Save button should be disabled when no date is selected
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
  });
}); 