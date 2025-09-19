import React, { useState, useCallback } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

interface AddTagModalProps {
  show: boolean;
  onHide: () => void;
  currentTagField: string;
  tagInputValue: string;
  setTagInputValue: (value: string) => void;
  addTagFromModal: () => void;
}

const AddTagModal: React.FC<AddTagModalProps> = ({
  show,
  onHide,
  currentTagField,
  tagInputValue,
  setTagInputValue,
  addTagFromModal
}) => {
  const handleAddTag = useCallback(() => {
    addTagFromModal();
  }, [addTagFromModal]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  }, [handleAddTag]);

  return (
    <Modal 
      show={show} 
      onHide={onHide}
      size="sm"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-plus-circle me-2"></i>
          Ajouter un Tag
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Ajouter une valeur pour "{currentTagField}"</Form.Label>
            <Form.Control
              type="text"
              value={tagInputValue}
              onChange={(e) => setTagInputValue(e.target.value)}
              placeholder="Saisissez la valeur"
              autoFocus
              onKeyPress={handleKeyPress}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          <i className="bi bi-x-circle me-2"></i>
          Annuler
        </Button>
        <Button 
          variant="primary" 
          onClick={handleAddTag}
          disabled={!tagInputValue.trim()}
        >
          <i className="bi bi-check-circle me-2"></i>
          Ajouter
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddTagModal;
