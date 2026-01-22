'use client';

import Input from '@/components/common/Input';
import Button from '@/components/common/Button';

export default function PersonalInfoTab({ 
  user, 
  formData, 
  onChange, 
  onSubmit, 
  updating 
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={onChange}
            required
            placeholder="John"
          />
          <Input
            label="Last Name"
            name="last_name"
            value={formData.last_name}
            onChange={onChange}
            required
            placeholder="Doe"
          />
        </div>

        <Input
          label="Email Address"
          value={user?.email}
          disabled
          className="bg-gray-50"
        />

        <Input
          label="Phone Number"
          value={user?.phone_number || 'Not provided'}
          disabled
          className="bg-gray-50"
        />

        <Input
          label="Address"
          name="address"
          value={formData.address}
          onChange={onChange}
          placeholder="Enter your address"
        />

        <div className="flex gap-4 pt-4">
          <Button type="submit" variant="primary" loading={updating}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}