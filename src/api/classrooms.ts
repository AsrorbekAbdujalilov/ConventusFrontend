import { apiClient } from './client'
import type {
  Classroom,
  ClassroomMessage,
  ClassroomTask,
} from './types'

export const classroomsApi = {
  async listClassrooms(): Promise<Classroom[]> {
    return apiClient<Classroom[]>('/api/classrooms/', { method: 'GET' })
  },

  async createClassroom(payload: { name: string; description?: string }): Promise<Classroom> {
    return apiClient<Classroom>('/api/classrooms/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async getClassroom(id: number): Promise<Classroom> {
    return apiClient<Classroom>(`/api/classrooms/${id}/`, { method: 'GET' })
  },

  async joinClassroom(joinCode: string): Promise<{ detail: string; classroom: Classroom }> {
    return apiClient<{ detail: string; classroom: Classroom }>(`/api/classrooms/join/`, {
      method: 'POST',
      body: JSON.stringify({ join_code: joinCode }),
    })
  },

  async leaveClassroom(id: number): Promise<{ detail: string }> {
    return apiClient<{ detail: string }>(`/api/classrooms/${id}/leave/`, {
      method: 'POST',
    })
  },

  async getMessages(id: number): Promise<ClassroomMessage[]> {
    return apiClient<ClassroomMessage[]>(`/api/classrooms/${id}/messages/`, { method: 'GET' })
  },

  async createMessage(id: number, payload: { message: string }): Promise<ClassroomMessage> {
    return apiClient<ClassroomMessage>(`/api/classrooms/${id}/messages/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async getTasks(id: number): Promise<ClassroomTask[]> {
    return apiClient<ClassroomTask[]>(`/api/classrooms/${id}/tasks/`, { method: 'GET' })
  },

  async createTask(id: number, payload: {
    title: string
    description?: string
    due_date?: string
    assignee_ids?: number[]
  }): Promise<ClassroomTask> {
    return apiClient<ClassroomTask>(`/api/classrooms/${id}/tasks/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async removeStudent(id: number, userId: number): Promise<{ detail: string }> {
    return apiClient<{ detail: string }>(`/api/classrooms/${id}/students/${userId}/`, {
      method: 'DELETE',
    })
  },
}
