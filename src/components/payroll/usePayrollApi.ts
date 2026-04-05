import { useCallback, useMemo } from 'react';
import type { PayrollPeriod, PayrollTask } from './types';

const BASE_URL = '';

function getRequestOptions(method: string = 'GET', body?: unknown): RequestInit {
  const options: RequestInit = {
    method,
    credentials: 'include',
  };
  if (body) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  return options;
}

export function usePayrollApi(periodId: number) {
  const fetchPeriod = useCallback(async (): Promise<PayrollPeriod | null> => {
    try {
      const response = await fetch(`${BASE_URL}/payroll/periods/${periodId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching period:', error);
    }
    return null;
  }, [periodId]);

  const updatePeriod = useCallback(async (data: Partial<PayrollPeriod>): Promise<boolean> => {
    try {
      const response = await fetch(
        `${BASE_URL}/payroll/periods/${periodId}`,
        getRequestOptions('PATCH', data)
      );
      return response.ok;
    } catch (error) {
      console.error('Error updating period:', error);
      return false;
    }
  }, [periodId]);

  const updateTask = useCallback(async (
    taskId: number,
    data: Partial<Pick<PayrollTask, 'completed' | 'toggle_value' | 'notes'>>
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `${BASE_URL}/payroll/tasks/${taskId}`,
        getRequestOptions('PATCH', data)
      );
      return response.ok;
    } catch (error) {
      console.error('Error updating task:', error);
      return false;
    }
  }, []);

  const editNote = useCallback(async (noteIndex: number, newValue: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${BASE_URL}/payroll/periods/${periodId}/notes/${noteIndex}`,
        getRequestOptions('PATCH', { new_value: newValue })
      );
      return response.ok;
    } catch (error) {
      console.error('Error updating note:', error);
      return false;
    }
  }, [periodId]);

  const deleteNote = useCallback(async (noteIndex: number): Promise<boolean> => {
    try {
      const response = await fetch(
        `${BASE_URL}/payroll/periods/${periodId}/notes/${noteIndex}`,
        { method: 'DELETE', credentials: 'include' }
      );
      return response.ok;
    } catch (error) {
      console.error('Error deleting note:', error);
      return false;
    }
  }, [periodId]);

  const sendEmail = useCallback(async (emailTemplate: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${BASE_URL}/payroll/periods/${periodId}/send-email/${emailTemplate}`,
        { method: 'POST', credentials: 'include' }
      );
      return response.ok;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }, [periodId]);

  return useMemo(() => ({
    fetchPeriod,
    updatePeriod,
    updateTask,
    editNote,
    deleteNote,
    sendEmail,
  }), [fetchPeriod, updatePeriod, updateTask, editNote, deleteNote, sendEmail]);
}
