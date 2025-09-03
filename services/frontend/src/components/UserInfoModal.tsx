import { SimpleModal } from "./SimpleModal";

interface UserInfoModalProps {
  open: boolean;
  onClose: () => void;
  email: string;
  role: string;
  joined: string;
  boardsOwned: number;
  boardsMember: number;
}

export function UserInfoModal({
  open,
  onClose,
  email,
  role,
  joined,
  boardsOwned,
  boardsMember,
}: UserInfoModalProps) {
  return (
    <SimpleModal open={open} onClose={onClose}>
      <h2 className="text-xl font-bold mb-4">Account Info</h2>
      <div className="mb-2"><strong>Email:</strong> {email}</div>
      <div className="mb-2"><strong>Role:</strong> {role}</div>
      <div className="mb-2"><strong>Joined:</strong> {new Date(joined).toLocaleDateString()}</div>
      <div className="mb-2"><strong>Boards Owned:</strong> {boardsOwned}</div>
      <div className="mb-2"><strong>Boards Member Of:</strong> {boardsMember}</div>
      <button
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={onClose}
      >
        Close
      </button>
    </SimpleModal>
  );
}