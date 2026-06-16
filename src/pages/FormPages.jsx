import { useNavigate } from 'react-router-dom';
import { MasterDetailForm } from '../components/forms/MasterDetailForm';
import { ComplexForm } from '../components/forms/ComplexForm';
import { useToast } from '../context/ToastContext';

export const MasterDetailPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <a href="/orders">Orders</a> › New Order
          </div>
          <div className="page-title">New Order</div>
          <div className="page-subtitle">Master–Detail form with line items and computed totals</div>
        </div>
      </div>
      <MasterDetailForm
        onSubmit={async (data) => {
          await new Promise(r => setTimeout(r, 800)); // simulate API
          console.log('Saved:', data);
        }}
        onCancel={() => navigate('/orders')}
      />
    </div>
  );
};

export const ComplexFormPage = () => {
  const toast = useToast();

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Account Settings</div>
          <div className="page-subtitle">Multi-section form with tabs and toggle switches</div>
        </div>
      </div>
      <ComplexForm
        initialData={{ email: 'jane@example.com', first_name: 'Jane', last_name: 'Doe', country: 'Argentina', timezone: 'UTC-3 (ART)' }}
        onSubmit={async (data) => {
          await new Promise(r => setTimeout(r, 600));
          console.log('Settings saved:', data);
        }}
      />
    </div>
  );
};
