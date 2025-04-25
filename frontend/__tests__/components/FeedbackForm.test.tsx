import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackForm from '../../src/components/FeedbackForm';

describe('FeedbackForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn().mockImplementation(() => Promise.resolve());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the feedback form when open', () => {
    render(
      <FeedbackForm 
        isOpen={true} 
        onClose={mockOnClose} 
        onSubmit={mockOnSubmit} 
      />
    );

    // Check for key elements
    expect(screen.getByText('Submit Feedback')).toBeInTheDocument();
    expect(screen.getByText('Your Feedback')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your feedback here...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    render(
      <FeedbackForm 
        isOpen={false} 
        onClose={mockOnClose} 
        onSubmit={mockOnSubmit} 
      />
    );

    // The modal should not be in the document when closed
    expect(screen.queryByText('Submit Feedback')).not.toBeInTheDocument();
  });

  test('calls onClose when Cancel button is clicked', async () => {
    render(
      <FeedbackForm 
        isOpen={true} 
        onClose={mockOnClose} 
        onSubmit={mockOnSubmit} 
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('Submit button is disabled with empty feedback', () => {
    render(
      <FeedbackForm 
        isOpen={true} 
        onClose={mockOnClose} 
        onSubmit={mockOnSubmit} 
      />
    );
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();
  });

  test('can type feedback and submit', async () => {
    render(
      <FeedbackForm 
        isOpen={true} 
        onClose={mockOnClose} 
        onSubmit={mockOnSubmit} 
      />
    );
    
    // Type feedback
    const feedbackTextarea = screen.getByPlaceholderText('Type your feedback here...');
    await userEvent.type(feedbackTextarea, 'This is my test feedback');
    
    // Submit button should be enabled
    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).not.toBeDisabled();
    
    // Click submit
    await userEvent.click(submitButton);
    
    // Check onSubmit was called with the feedback text
    expect(mockOnSubmit).toHaveBeenCalledWith('This is my test feedback');
    
    // Form should close after successful submission
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  test('handles submission errors', async () => {
    // Mock console.error to avoid test output noise
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    // Mock onSubmit to reject
    const mockOnSubmitError = jest.fn().mockImplementation(() => Promise.reject(new Error('Submission failed')));
    
    render(
      <FeedbackForm 
        isOpen={true} 
        onClose={mockOnClose} 
        onSubmit={mockOnSubmitError} 
      />
    );
    
    // Type feedback
    const feedbackTextarea = screen.getByPlaceholderText('Type your feedback here...');
    await userEvent.type(feedbackTextarea, 'This will fail');
    
    // Click submit
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);
    
    // Error should be logged
    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    });
    
    // Form should not close on error
    expect(mockOnClose).not.toHaveBeenCalled();
    
    // Restore console.error
    console.error = originalConsoleError;
  });
}); 