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
      <div className="flex flex-col gap-2 w-full max-w-xs sm:max-w-md mx-auto p-2 sm:p-4">
        <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-4 text-center">
          Account Info
        </h2>
        <div className="mb-1 sm:mb-2">
          <strong>Email:</strong>{" "}
          <span className="break-all">{email}</span>
        </div>
        <div className="mb-1 sm:mb-2">
          <strong>Role:</strong> {role}
        </div>
        <div className="mb-1 sm:mb-2">
          <strong>Joined:</strong> {new Date(joined).toLocaleDateString()}
        </div>
        <div className="mb-1 sm:mb-2">
          <strong>Boards Owned:</strong> {boardsOwned}
        </div>
        <div className="mb-1 sm:mb-2">
          <strong>Boards Member Of:</strong> {boardsMember}
        </div>
        <button
          className="mt-2 sm:mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </SimpleModal>
  );
}