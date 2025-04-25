import React, { useState } from 'react';
import {
  Modal,
  ModalVariant,
  Button,
  Form,
  FormGroup,
  TextArea,
  Text,
  TextVariants,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { CommentIcon } from '@patternfly/react-icons';

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: string) => Promise<void>;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ isOpen, onClose, onSubmit }) => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(feedback);
      setFeedback('');
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      variant={ModalVariant.small}
      title="Submit Feedback"
      isOpen={isOpen}
      onClose={onClose}
      actions={[
        <Button
          key="submit"
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!feedback.trim() || isSubmitting}
        >
          Submit
        </Button>,
        <Button key="cancel" variant="link" onClick={onClose}>
          Cancel
        </Button>
      ]}
    >
      <Form>
        <FormGroup
          label="Your Feedback"
          fieldId="feedback"
        >
          <Text component={TextVariants.small} className="pf-v5-u-mb-sm">
            Share your thoughts about the app, report issues, or suggest improvements.
          </Text>
          <TextArea
            id="feedback"
            value={feedback}
            onChange={(_, value) => setFeedback(value)}
            placeholder="Type your feedback here..."
            rows={6}
          />
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default FeedbackForm; 