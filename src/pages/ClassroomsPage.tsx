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

  const renderClassroomHeader = (activeTab: 'stream' | 'classwork') => {
    if (!selectedClassroom) return null

    return (
      <>
        <header className="classroom-course-banner">
          <div>
            <span>{selectedClassroom.teacher?.username || 'Classroom'}</span>
            <h1>{selectedClassroom.name}</h1>
            <p>{selectedClassroom.description || 'Welcome to your classroom.'}</p>
          </div>
          <span className="classroom-course-code">Class ID&nbsp; {selectedClassroom.join_code}</span>
        </header>
        <nav className="classroom-tabs" aria-label="Classroom sections">
          <Link
            to={`/classrooms/${selectedClassroom.id}`}
            className={activeTab === 'stream' ? 'active' : ''}
          >
            Stream
          </Link>
          <Link
            to={`/classrooms/${selectedClassroom.id}/tasks`}
            className={activeTab === 'classwork' ? 'active' : ''}
          >
            Classwork
          </Link>
        </nav>
      </>
    )
  }

  const renderOverviewPage = () => (
    <div className="wrap classroom-page">
      {error && <div className="alert error">{error}</div>}
      {info && <div className="alert success">{info}</div>}

      {!selectedClassroom ? (
        <>
          <header className="classroom-dashboard-heading">
            <div>
              <span className="eyebrow">Conventus classrooms</span>
              <h1>Your classes</h1>
            </div>
            <div className="button-row">
              {isTeacher && <Link to="/classrooms/create" className="btn primary">Create class</Link>}
              <Link to="/classrooms/join" className="btn line">Join a class</Link>
            </div>
          </header>
          {loading ? <div className="empty-state">Loading your classes…</div> : classrooms.length === 0 ? (
            <div className="classroom-empty panel">
              <h2>Your classroom is just getting started</h2>
              <p>Create a class or join one with the code from your teacher.</p>
              <div className="button-row">
                {isTeacher && <Link to="/classrooms/create" className="btn primary">Create class</Link>}
                <Link to="/classrooms/join" className="btn line">Join a class</Link>
              </div>
            </div>
          ) : (
            <div className="classroom-course-grid">
              {classrooms.map((room) => (
                <Link key={room.id} to={`/classrooms/${room.id}`} className="classroom-course-card">
                  <div className="classroom-card-banner">
                    <h2>{room.name}</h2>
                    <span>{room.teacher?.username || 'Classroom'}</span>
                  </div>
                  <div className="classroom-card-body">
                    <p>{room.description || 'Open this class to see updates and assignments.'}</p>
                    <div className="classroom-card-footer">
                      <span>{room.students?.length || 0} students</span>
                      <span aria-hidden="true">Open class&nbsp;→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {renderClassroomHeader('stream')}
          <div className="classroom-stream-layout">
            <main className="classroom-stream">
              <section className="classroom-panel classroom-post-prompt">
                <span className="classroom-avatar" aria-hidden="true">
                  {(user.username || 'U').slice(0, 1).toUpperCase()}
                </span>
                <Link to={`/classrooms/${selectedClassroom.id}/messages`}>
                  Share something with your class…
                </Link>
              </section>
              <section className="classroom-panel">
                <div className="classroom-section-heading">
                  <h2>Recent updates</h2>
                  <Link to={`/classrooms/${selectedClassroom.id}/messages`}>View all</Link>
                </div>
                {messages.length === 0 ? (
                  <div className="empty-state">Your class updates will appear here.</div>
                ) : (
                  <div className="classroom-updates">
                    {messages.slice(-3).reverse().map((message) => (
                      <article className="classroom-update" key={message.id}>
                        <span className="classroom-avatar" aria-hidden="true">
                          {(message.sender?.username || 'U').slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <strong>{message.sender?.username || 'User'}</strong>
                          <small>{new Date(message.created_at).toLocaleString()}</small>
                          <p>{message.message}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              <section className="classroom-panel">
                <div className="classroom-section-heading">
                  <h2>Classwork</h2>
                  <Link to={`/classrooms/${selectedClassroom.id}/tasks`}>View all</Link>
                </div>
                {tasks.length === 0 ? (
                  <div className="empty-state">No assignments have been posted yet.</div>
                ) : (
                  <div className="classroom-updates">
                    {tasks.slice(0, 3).map((task) => (
                      <article className="classroom-assignment" key={task.id}>
                        <span className="classroom-assignment-icon" aria-hidden="true">✓</span>
                        <div>
                          <strong>{task.title}</strong>
                          <small>{task.due_date ? `Due ${new Date(task.due_date).toLocaleDateString()}` : 'No due date'}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </main>
            <aside className="classroom-sidebar-cards">
              <section className="classroom-panel">
                <div className="classroom-section-heading">
                  <h2>Class code</h2>
                </div>
                <p className="classroom-code">{selectedClassroom.join_code}</p>
              </section>
              <section className="classroom-panel" id="people">
                <div className="classroom-section-heading">
                  <h2>Teachers</h2>
                </div>
                <div className="classroom-person">
                  <span className="classroom-avatar" aria-hidden="true">
                    {(selectedClassroom.teacher?.username || 'T').slice(0, 1).toUpperCase()}
                  </span>
                  <strong>{selectedClassroom.teacher?.username || 'Teacher'}</strong>
                </div>
                <div className="classroom-section-heading classroom-people-heading">
                  <h2>Classmates</h2>
                  <span>{selectedClassroom.students?.length || 0}</span>
                </div>
                {(selectedClassroom.students || []).slice(0, 5).map((student) => (
                  <div className="classroom-person" key={student.id}>
                    <span className="classroom-avatar" aria-hidden="true">
                      {(student.first_name || student.username).slice(0, 1).toUpperCase()}
                    </span>
                    <strong>{student.first_name || student.username}</strong>
                  </div>
                ))}
                {(!selectedClassroom.students || selectedClassroom.students.length === 0) && (
                  <p className="classroom-muted">No classmates yet.</p>
                )}
              </section>
              {!isTeacher && (
                <button className="btn line danger classroom-leave-button" onClick={handleLeaveClassroom}>
                  Leave class
                </button>
              )}
            </aside>
          </div>
        </>
      )}
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
        {renderClassroomHeader('classwork')}
        <section className="classroom-panel classroom-work-panel">
          <div className="classroom-section-heading">
            <h2>Classwork</h2>
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
        {renderClassroomHeader('stream')}
        <section className="classroom-panel classroom-messages-panel">
          <div className="classroom-section-heading">
            <h2>Class updates</h2>
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
