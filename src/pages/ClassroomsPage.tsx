import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { classroomsApi } from '../api/classrooms'
import type { Classroom, ClassroomMessage, ClassroomTask } from '../api/types'
import { useAuth } from '../context/AuthContext'

const emptyTaskForm = {
  title: '',
  description: '',
  due_date: '',
  assignee_ids: [] as number[],
}

type ClassroomPageTab = 'overview' | 'create' | 'join' | 'tasks' | 'messages'

interface ClassroomsPageProps {
  initialTab?: ClassroomPageTab
}

export function ClassroomsPage({ initialTab = 'overview' }: ClassroomsPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ id?: string }>()
  const { user } = useAuth()

  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [messages, setMessages] = useState<ClassroomMessage[]>([])
  const [tasks, setTasks] = useState<ClassroomTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDescription, setNewRoomDescription] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [messageText, setMessageText] = useState('')
  const [taskForm, setTaskForm] = useState(emptyTaskForm)

  const routeId = params.id ? Number(params.id) : null
  const selectedClassroom = useMemo(
    () => classrooms.find((classroom) => classroom.id === routeId) ?? null,
    [classrooms, routeId]
  )

  const pageTab: ClassroomPageTab = (() => {
    if (location.pathname.endsWith('/create')) return 'create'
    if (location.pathname.endsWith('/join')) return 'join'
    if (location.pathname.endsWith('/tasks')) return 'tasks'
    if (location.pathname.endsWith('/messages')) return 'messages'
    return params.id ? 'overview' : initialTab
  })()

  const isTeacher = Array.isArray(user?.groups) && user.groups.some((group) => group.toLowerCase() === 'teacher')

  const loadClassrooms = async () => {
    try {
      setLoading(true)
      const data = await classroomsApi.listClassrooms()
      setClassrooms(data)
      if (!routeId && data.length > 0 && pageTab !== 'create' && pageTab !== 'join') {
        navigate(`/classrooms/${data[0].id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load classrooms.')
    } finally {
      setLoading(false)
    }
  }

  const loadDetail = async (classroomId: number) => {
    try {
      const [roomMessages, roomTasks] = await Promise.all([
        classroomsApi.getMessages(classroomId),
        classroomsApi.getTasks(classroomId),
      ])
      setMessages(roomMessages)
      setTasks(roomTasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load classroom details.')
    }
  }

  useEffect(() => {
    if (!user) return
    void loadClassrooms()
  }, [user])

  useEffect(() => {
    if (!routeId) {
      setMessages([])
      setTasks([])
      return
    }
    void loadDetail(routeId)
  }, [routeId])

  const handleCreateClassroom = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newRoomName.trim()) {
      setError('Please enter a classroom name.')
      return
    }

    try {
      const created = await classroomsApi.createClassroom({
        name: newRoomName.trim(),
        description: newRoomDescription.trim(),
      })
      setInfo(`Classroom “${created.name}” created.`)
      setNewRoomName('')
      setNewRoomDescription('')
      setClassrooms((prev) => [created, ...prev])
      navigate(`/classrooms/${created.id}`)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create classroom.')
    }
  }

  const handleJoinClassroom = async () => {
    const normalizedCode = joinCode.trim()
    if (!normalizedCode) {
      setError('Enter the classroom code to join.')
      return
    }

    try {
      const result = await classroomsApi.joinClassroom(normalizedCode)
      setInfo(result.detail)
      setJoinCode('')
      setClassrooms((prev) => {
        const exists = prev.some((room) => room.id === result.classroom.id)
        return exists ? prev : [result.classroom, ...prev]
      })
      navigate(`/classrooms/${result.classroom.id}`)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join classroom.')
    }
  }

  const handleLeaveClassroom = async () => {
    if (!routeId) return

    try {
      const result = await classroomsApi.leaveClassroom(routeId)
      setInfo(result.detail)
      setClassrooms((prev) => prev.filter((room) => room.id !== routeId))
      navigate('/classrooms')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not leave classroom.')
    }
  }

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!routeId || !messageText.trim()) {
      setError('Write a message before sending.')
      return
    }

    try {
      const sent = await classroomsApi.createMessage(routeId, { message: messageText.trim() })
      setMessages((prev) => [...prev, sent])
      setMessageText('')
      setInfo('Message sent.')
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message.')
    }
  }

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!routeId || !taskForm.title.trim()) {
      setError('Task title is required.')
      return
    }

    try {
      const created = await classroomsApi.createTask(routeId, {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        due_date: taskForm.due_date || undefined,
        assignee_ids: taskForm.assignee_ids,
      })
      setTasks((prev) => [created, ...prev])
      setTaskForm(emptyTaskForm)
      setInfo(`Task “${created.title}” assigned.`)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign task.')
    }
  }

  if (!user) {
    return (
      <div className="wrap">
        <section className="classroom-locked">
          <span className="eyebrow">Study rooms</span>
          <h1>Classrooms are available when you sign in.</h1>
          <p>Teachers can create rooms and students can join them using a unique code to collaborate, send messages and complete tasks.</p>
          <div className="button-row">
            <button className="btn primary" onClick={() => navigate('/auth')}>Login</button>
            <button className="btn line" onClick={() => navigate('/register')}>Create account</button>
          </div>
        </section>
      </div>
    )
  }

  const renderOverviewPage = () => (
    <div className="wrap classroom-page">
      <section className="classroom-hero panel">
        <div>
          <span className="eyebrow">Conventus classrooms</span>
          <h1>Study rooms for teachers and students</h1>
          <p>Use a classroom code to join, then move to assignments and messages in separate pages.</p>
        </div>
        <div className="badge-row">
          <span className="badge soft">{isTeacher ? 'Teacher view' : 'Student view'}</span>
          <span className="badge neutral">{classrooms.length} room{classrooms.length === 1 ? '' : 's'}</span>
        </div>
      </section>

      {error && <div className="alert error">{error}</div>}
      {info && <div className="alert success">{info}</div>}

      <div className="classroom-grid">
        <aside className="panel classroom-sidebar">
          <div className="section-header">
            <h3>My classrooms</h3>
          </div>

          <div className="button-row stacked">
            {isTeacher && (
              <Link to="/classrooms/create" className="btn primary full">Create classroom</Link>
            )}
            <Link to="/classrooms/join" className="btn line full">Join with code</Link>
          </div>

          {loading ? <div className="muted">Loading classrooms…</div> : (
            <div className="room-list">
              {classrooms.length === 0 ? (
                <div className="empty-state">No classrooms yet. Create one or join with a classroom code.</div>
              ) : (
                classrooms.map((room) => (
                  <Link
                    key={room.id}
                    to={`/classrooms/${room.id}`}
                    className={`room-card ${routeId === room.id ? 'selected' : ''}`}
                  >
                    <div className="room-topline">
                      <strong>{room.name}</strong>
                      <span>#{room.id}</span>
                    </div>
                    <small>{room.teacher?.username || 'Teacher'}</small>
                    <p>{room.description || 'No description yet.'}</p>
                  </Link>
                ))
              )}
            </div>
          )}
        </aside>

        <section className="panel classroom-main">
          {!selectedClassroom ? (
            <div className="empty-state large">Select a classroom to view its overview.</div>
          ) : (
            <>
              <div className="classroom-header">
                <div>
                  <span className="eyebrow">Selected room</span>
                  <h2>{selectedClassroom.name}</h2>
                  <p>{selectedClassroom.description || 'Classroom description coming soon.'}</p>
                </div>
                {!isTeacher && (
                  <button className="btn line danger" onClick={handleLeaveClassroom}>Leave classroom</button>
                )}
              </div>

              <div className="stats-grid">
                <div className="mini-stat">
                  <span>Teacher</span>
                  <strong>{selectedClassroom.teacher?.username || 'Teacher'}</strong>
                </div>
                <div className="mini-stat">
                  <span>Students</span>
                  <strong>{selectedClassroom.students?.length || 0}</strong>
                </div>
                <div className="mini-stat">
                  <span>Join code</span>
                  <strong>{selectedClassroom.join_code}</strong>
                </div>
                <div className="mini-stat">
                  <span>Tasks</span>
                  <strong>{tasks.length}</strong>
                </div>
              </div>

              <div className="button-row">
                <Link to={`/classrooms/${selectedClassroom.id}/messages`} className="btn line">Messages</Link>
                <Link to={`/classrooms/${selectedClassroom.id}/tasks`} className="btn line">Assignments</Link>
              </div>

              <div className="content-panel">
                <div className="section-header">
                  <h3>Students</h3>
                </div>
                <div className="student-list">
                  {(selectedClassroom.students || []).map((student) => (
                    <div className="student-row" key={student.id}>
                      <div>
                        <strong>{student.first_name || student.username}</strong>
                        <small>@{student.username}</small>
                      </div>
                    </div>
                  ))}
                  {(!selectedClassroom.students || selectedClassroom.students.length === 0) && (
                    <div className="empty-state small">No students in this classroom yet.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )

  const renderCreatePage = () => (
    <div className="wrap classroom-page">
      <section className="panel classroom-main">
        <div className="classroom-header">
          <div>
            <span className="eyebrow">Teacher flow</span>
            <h2>Create classroom</h2>
          </div>
          <Link to="/classrooms" className="btn ghost">Back</Link>
        </div>

        <form className="stacked-form" onSubmit={handleCreateClassroom}>
          <input
            value={newRoomName}
            onChange={(event) => setNewRoomName(event.target.value)}
            placeholder="Classroom name"
          />
          <textarea
            value={newRoomDescription}
            onChange={(event) => setNewRoomDescription(event.target.value)}
            placeholder="Classroom description"
            rows={4}
          />
          <button type="submit" className="btn primary">Create classroom</button>
        </form>
      </section>
    </div>
  )

  const renderJoinPage = () => (
    <div className="wrap classroom-page">
      <section className="panel classroom-main">
        <div className="classroom-header">
          <div>
            <span className="eyebrow">Student flow</span>
            <h2>Join classroom</h2>
          </div>
          <Link to="/classrooms" className="btn ghost">Back</Link>
        </div>

        <div className="join-box">
          <label>Classroom code</label>
          <div className="join-row">
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="Enter 8-character code"
              style={{ textTransform: 'uppercase' }}
            />
            <button type="button" className="btn primary" onClick={handleJoinClassroom}>Join</button>
          </div>
        </div>
      </section>
    </div>
  )

  const renderTasksPage = () => {
    if (!selectedClassroom) return <div className="wrap classroom-page"><section className="panel classroom-main"><div className="empty-state large">Choose a classroom first.</div></section></div>

    return (
      <div className="wrap classroom-page">
        <section className="panel classroom-main">
          <div className="classroom-header">
            <div>
              <span className="eyebrow">Assignments</span>
              <h2>{selectedClassroom.name}</h2>
            </div>
            <div className="button-row">
              <Link to={`/classrooms/${selectedClassroom.id}`} className="btn ghost">Overview</Link>
              <Link to={`/classrooms/${selectedClassroom.id}/messages`} className="btn line">Messages</Link>
            </div>
          </div>

          {isTeacher && (
            <form className="task-form" onSubmit={handleCreateTask}>
              <input
                value={taskForm.title}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Task title"
              />
              <textarea
                value={taskForm.description}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Task description"
                rows={4}
              />
              <div className="task-inline">
                <input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, due_date: event.target.value }))}
                />
                <button type="submit" className="btn primary">Assign task</button>
              </div>
            </form>
          )}

          <div className="task-list">
            {tasks.length === 0 ? (
              <div className="empty-state small">No tasks assigned yet.</div>
            ) : (
              tasks.map((task) => (
                <div className="task-card" key={task.id}>
                  <div className="task-top">
                    <strong>{task.title}</strong>
                    <span className={`status-pill ${task.completed ? 'done' : 'open'}`}>
                      {task.completed ? 'Completed' : 'Open'}
                    </span>
                  </div>
                  <p>{task.description || 'No task details uploaded.'}</p>
                  <div className="task-meta">
                    <small>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</small>
                    <small>Assigned to: {task.assignees?.length || 0}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    )
  }

  const renderMessagesPage = () => {
    if (!selectedClassroom) return <div className="wrap classroom-page"><section className="panel classroom-main"><div className="empty-state large">Choose a classroom first.</div></section></div>

    return (
      <div className="wrap classroom-page">
        <section className="panel classroom-main">
          <div className="classroom-header">
            <div>
              <span className="eyebrow">Messages</span>
              <h2>{selectedClassroom.name}</h2>
            </div>
            <div className="button-row">
              <Link to={`/classrooms/${selectedClassroom.id}`} className="btn ghost">Overview</Link>
              <Link to={`/classrooms/${selectedClassroom.id}/tasks`} className="btn line">Assignments</Link>
            </div>
          </div>

          <div className="message-list">
            {messages.length === 0 ? (
              <div className="empty-state small">No classroom updates yet.</div>
            ) : (
              messages.map((message) => (
                <div className="message-card" key={message.id}>
                  <strong>{message.sender?.username || 'User'}</strong>
                  <p>{message.message}</p>
                  <small>{new Date(message.created_at).toLocaleString()}</small>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="message-form">
            <textarea
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              rows={4}
              placeholder="Write a classroom message..."
            />
            <button type="submit" className="btn primary full">Send message</button>
          </form>
        </section>
      </div>
    )
  }

  if (pageTab === 'create') return renderCreatePage()
  if (pageTab === 'join') return renderJoinPage()
  if (pageTab === 'tasks') return renderTasksPage()
  if (pageTab === 'messages') return renderMessagesPage()
  return renderOverviewPage()
}
